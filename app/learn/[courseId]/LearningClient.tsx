"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {mergeRanges,progressPercent} from "@/lib/progress";
import type {WatchedRange} from "@/lib/types";

declare global { interface Window { YT:any; onYouTubeIframeAPIReady?:()=>void } }

type P={id:string,title:string,description:string,video_ref:string,order_no:number,progress:any};

function loadYouTubeApi(){return new Promise<void>((resolve)=>{if(window.YT?.Player)return resolve();const existing=document.querySelector('script[src="https://www.youtube.com/iframe_api"]');const prev=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{prev?.();resolve();};if(!existing){const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s);}})}

function furthestWatchedSecond(ranges:WatchedRange[]){
 return ranges.reduce((max,range)=>{
  const end=Number(range?.[1]||0);
  return Number.isFinite(end)?Math.max(max,end):max;
 },0);
}

// Keep the JS package and WASM runtime on the same pinned version.
// Using @latest here can load a different runtime than package-lock.json and cause
// hard-to-diagnose MediaPipe behavior after a fresh npm install.
const MEDIAPIPE_TASKS_VISION_VERSION = "1.0.1";
const MEDIAPIPE_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VISION_VERSION}/wasm`;
const DEFAULT_FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";

/**
 * MediaPipe/TFLite currently prints the harmless XNNPACK startup message through
 * console.error in some browser builds. Next.js dev mode interprets every
 * console.error call as a Console Error overlay, so the learner sees a red error
 * screen even though face detection is working.
 *
 * Suppress only that known INFO message. All real errors/warnings still pass
 * through to the original console methods.
 */
function installMediaPipeInfoConsoleFilter() {
  const originalError = console.error;
  const originalWarn = console.warn;

  const isHarmlessMediaPipeInfo = (args: unknown[]) => {
    const message = args
      .map((value) => {
        if (typeof value === "string") return value;
        try { return String(value); } catch { return ""; }
      })
      .join(" ");

    return (
      message.includes("INFO: Created TensorFlow Lite XNNPACK delegate for CPU") ||
      message.includes("Created TensorFlow Lite XNNPACK delegate for CPU")
    );
  };

  console.error = (...args: unknown[]) => {
    if (isHarmlessMediaPipeInfo(args)) return;
    originalError(...args);
  };

  console.warn = (...args: unknown[]) => {
    if (isHarmlessMediaPipeInfo(args)) return;
    originalWarn(...args);
  };

  return () => {
    console.error = originalError;
    console.warn = originalWarn;
  };
}

export default function LearningClient({course,parts,initialPartId}:{course:any,parts:P[],initialPartId?:string}){
 const [activeId,setActiveId]=useState(initialPartId||parts[0].id);
 const active=parts.find(p=>p.id===activeId)!;
 const [progressByPart,setProgressByPart]=useState<Record<string,number>>(()=>Object.fromEntries(parts.map(p=>[p.id,Number(p.progress?.progress_pct||0)])));
 const rangesRef=useRef<Record<string,WatchedRange[]>>(Object.fromEntries(parts.map(p=>[p.id,(p.progress?.watched_ranges||[]) as WatchedRange[]])));
 const [facePresent,setFacePresent]=useState(false);const facePresentRef=useRef(false);const [cameraState,setCameraState]=useState<'starting'|'ready'|'denied'>('starting');const [missingSeconds,setMissingSeconds]=useState(0);const missingRef=useRef(0);
 const cameraRef=useRef<HTMLVideoElement|null>(null);const playerRef=useRef<any>(null);const durationRef=useRef<Record<string,number>>({});const lastSaveRef=useRef(0);const activeRef=useRef(activeId);activeRef.current=activeId;
 // Track actual YouTube playback movement separately from watched progress.
 // This lets us distinguish a real manual seek from normal playback while
 // face detection is temporarily missing.
 const playbackSampleRef=useRef<Record<string,{videoTime:number,wallTime:number}>>({});
 // Resume position is navigation state, separate from credited watched progress.
 // This prevents small face-detection gaps from forcing Resume back to the first gap.
 const lastPositionRef=useRef<Record<string,number>>(Object.fromEntries(parts.map(p=>[
  p.id,
  Number(p.progress?.last_position_seconds||0)
 ])));
 // Highest position reached by natural playback. Forward seeks beyond this are blocked,
 // while seeking back inside an already reached area remains allowed.
 const allowedForwardRef=useRef<Record<string,number>>(Object.fromEntries(parts.map(p=>[
  p.id,
  Math.max(
   Number(p.progress?.last_position_seconds||0),
   furthestWatchedSecond((p.progress?.watched_ranges||[]) as WatchedRange[])
  )
 ])));
 const [playerReady,setPlayerReady]=useState(false);const [message,setMessage]=useState('');

 const save=useCallback(async(partId:string,current:number,keepalive=false)=>{
  const duration=durationRef.current[partId]||playerRef.current?.getDuration?.()||0;
  if(!duration)return;
  const safeCurrent=Math.max(0,Math.min(Number(current)||0,Number(duration)));
  lastPositionRef.current[partId]=safeCurrent;
  const body={
   part_id:partId,
   duration_seconds:duration,
   watched_ranges:rangesRef.current[partId]||[],
   last_position_seconds:safeCurrent
  };
  try{
   const r=await fetch('/api/progress',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body),
    keepalive
   });
   if(r.ok){
    const j=await r.json();
    rangesRef.current[partId]=j.watched_ranges||rangesRef.current[partId];
    lastPositionRef.current[partId]=Number(j.last_position_seconds??safeCurrent);
    allowedForwardRef.current[partId]=Math.max(
     Number(allowedForwardRef.current[partId]||0),
     Number(j.last_position_seconds??safeCurrent),
     furthestWatchedSecond(rangesRef.current[partId]||[])
    );
    setProgressByPart(x=>({...x,[partId]:Number(j.progress_pct||0)}));
   }
  }catch{}
 },[]);

 useEffect(()=>{
  let cancelled=false;
  let detector:any=null;
  let stream:MediaStream|null=null;
  let timer:ReturnType<typeof setTimeout>|null=null;

  // Install before importing/initializing MediaPipe so Next.js dev overlay never
  // receives the harmless TFLite XNNPACK INFO message.
  const restoreConsole=installMediaPipeInfoConsoleFilter();

  (async()=>{
   try{
    const {FaceDetector,FilesetResolver}=await import('@mediapipe/tasks-vision');
    const vision=await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

    detector=await FaceDetector.createFromOptions(vision,{
     baseOptions:{
      modelAssetPath:process.env.NEXT_PUBLIC_FACE_MODEL_URL||DEFAULT_FACE_MODEL_URL
     },
     runningMode:'VIDEO',
     minDetectionConfidence:.6
    });

    stream=await navigator.mediaDevices.getUserMedia({
     video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},
     audio:false
    });

    if(cancelled){
     stream.getTracks().forEach(t=>t.stop());
     return;
    }

    if(cameraRef.current){
     cameraRef.current.srcObject=stream;
     await cameraRef.current.play();
    }

    setCameraState('ready');

    const detect=()=>{
     if(cancelled||!cameraRef.current||!detector)return;
     try{
      const result=detector.detectForVideo(cameraRef.current,performance.now());
      const ok=(result?.detections?.length||0)>0;
      facePresentRef.current=ok;
      setFacePresent(ok);

      if(ok){
       missingRef.current=0;
       setMissingSeconds(0);
      }else{
       missingRef.current+=.8;
       setMissingSeconds(Math.round(missingRef.current));
       if(missingRef.current>=10&&playerRef.current?.getPlayerState?.()===1){
        playerRef.current.pauseVideo();
        setMessage('ไม่พบใบหน้าต่อเนื่อง 10 วินาที ระบบหยุดวิดีโอและหยุดนับ Progress');
       }
      }
     }catch(error){
      // A single bad frame must not stop the detector loop. Keep this as warn so
      // genuine runtime problems remain visible without becoming a fatal overlay.
      console.warn('Face detection frame skipped:',error);
     }
     timer=setTimeout(detect,800);
    };

    detect();
   }catch(error:any){
    setCameraState('denied');
    const permissionDenied=
     error?.name==='NotAllowedError'||
     error?.name==='PermissionDeniedError';
    setMessage(
     permissionDenied
      ?'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาต Camera permission แล้วโหลดหน้าใหม่'
      :'ระบบตรวจจับใบหน้าเริ่มทำงานไม่สำเร็จ กรุณาโหลดหน้าใหม่ หากยังเกิดซ้ำให้ตรวจ Console'
    );
    console.error('Face detector initialization failed:',error);
   }
  })();

  return()=>{
   cancelled=true;
   if(timer)clearTimeout(timer);
   stream?.getTracks().forEach(t=>t.stop());
   detector?.close?.();
   restoreConsole();
  };
 },[]);

 useEffect(()=>{let dead=false;(async()=>{await loadYouTubeApi();if(dead)return;setPlayerReady(false);playerRef.current?.destroy?.();const holder=document.getElementById('yt-player');if(!holder)return;holder.innerHTML='';const div=document.createElement('div');div.id='yt-player-inner';holder.appendChild(div);playerRef.current=new window.YT.Player('yt-player-inner',{videoId:active.video_ref,playerVars:{playsinline:1,rel:0,origin:window.location.origin},events:{onReady:(e:any)=>{
   durationRef.current[active.id]=e.target.getDuration();
   // Repair old records too: if progress ranges reached farther than the old
   // last_position_seconds, resume from the farthest actually watched range.
   const old=Math.max(
    Number(lastPositionRef.current[active.id]||active.progress?.last_position_seconds||0),
    furthestWatchedSecond(rangesRef.current[active.id]||[])
   );
   const duration=Number(e.target.getDuration?.()||0);
   const resumeAt=duration?Math.min(old,Math.max(0,duration-1)):old;
   lastPositionRef.current[active.id]=resumeAt;
   allowedForwardRef.current[active.id]=Math.max(
    Number(allowedForwardRef.current[active.id]||0),
    resumeAt
   );
   if(resumeAt>1)e.target.seekTo(resumeAt,true);
   playbackSampleRef.current[active.id]={videoTime:resumeAt>1?resumeAt:0,wallTime:performance.now()};
   setPlayerReady(true);
  },onStateChange:(e:any)=>{
   // Persist immediately on pause/end so a long session is not dependent only
   // on the periodic save timer.
   if(e.data===0||e.data===2){
    const t=Number(e.target?.getCurrentTime?.()||0);
    void save(active.id,t,true);
   }
  }}});})();return()=>{dead=true;};},[active.id,active.video_ref,save]);

 useEffect(()=>{
  const persistCurrent=()=>{
   const p=playerRef.current;
   const t=Number(p?.getCurrentTime?.()||lastPositionRef.current[activeRef.current]||0);
   void save(activeRef.current,t,true);
  };
  const onVis=()=>{
   if(document.hidden){
    const p=playerRef.current;
    if(p?.getPlayerState?.()===1)p.pauseVideo();
    persistCurrent();
   }
  };
  const onPageHide=()=>persistCurrent();
  document.addEventListener('visibilitychange',onVis);
  window.addEventListener('pagehide',onPageHide);
  return()=>{
   document.removeEventListener('visibilitychange',onVis);
   window.removeEventListener('pagehide',onPageHide);
  };
 },[save]);

 useEffect(()=>{const timer=setInterval(()=>{const p=playerRef.current;if(!p||!playerReady)return;const partId=activeRef.current;const current=Number(p.getCurrentTime?.()||0);const duration=Number(p.getDuration?.()||0);if(duration)durationRef.current[partId]=duration;const ranges=rangesRef.current[partId]||[];

  // Detect a genuine manual forward jump from playback movement itself.
  // Resume position / allowed forward position is deliberately independent
  // from credited progress, because credited progress can contain small gaps
  // when face detection is temporarily lost.
  const now=performance.now();
  const previous=playbackSampleRef.current[partId];
  const playbackRate=Math.max(0.25,Number(p.getPlaybackRate?.()||1));
  const wallElapsed=previous?Math.max(0,(now-previous.wallTime)/1000):0;
  const videoAdvance=previous?current-previous.videoTime:0;
  const naturalAdvanceAllowance=(wallElapsed*playbackRate)+2.5;
  const looksLikeManualForwardSeek=Boolean(previous)&&videoAdvance>Math.max(4,naturalAdvanceAllowance);

  const allowedForward=Math.max(
   Number(allowedForwardRef.current[partId]||0),
   furthestWatchedSecond(ranges)
  );

  if(looksLikeManualForwardSeek&&current>allowedForward+7){
   p.seekTo(allowedForward,true);
   playbackSampleRef.current[partId]={videoTime:allowedForward,wallTime:now};
   lastPositionRef.current[partId]=allowedForward;
   setMessage('ยังไม่สามารถลากข้ามช่วงที่ไม่เคยเรียนได้');
   return;
  }

  // Natural playback advances the resume/seek ceiling even during a short
  // face-detection gap. Those seconds are NOT credited to Progress unless
  // facePresent is true below.
  if(!looksLikeManualForwardSeek){
   allowedForwardRef.current[partId]=Math.max(allowedForward,current);
  }
  lastPositionRef.current[partId]=current;
  playbackSampleRef.current[partId]={videoTime:current,wallTime:now};
  const playing=p.getPlayerState?.()===1;if(playing&&document.visibilityState==='visible'&&facePresentRef.current&&cameraState==='ready'){const next=mergeRanges([...ranges,[Math.max(0,current-1.4),current]]);rangesRef.current[partId]=next;setProgressByPart(x=>({...x,[partId]:progressPercent(next,duration)}));lastSaveRef.current+=1;if(lastSaveRef.current>=7){lastSaveRef.current=0;void save(partId,current);}}},1000);return()=>clearInterval(timer);},[playerReady,cameraState,parts,save]);

 function switchPart(id:string){const old=activeRef.current;const t=playerRef.current?.getCurrentTime?.()||0;void save(old,t);setActiveId(id);setMessage('');}
 const unlocked=useMemo(()=>parts.every(p=>(progressByPart[p.id]||0)>=Number(course.passing_progress)),[parts,progressByPart,course.passing_progress]);
 const overall=Math.round(parts.reduce((s,p)=>s+(progressByPart[p.id]||0),0)/parts.length);
 return <div className="learn-layout">
  <section className="card panel"><div className="space"><div><div className="eyebrow">PART {active.order_no}</div><h3>{active.title}</h3></div><span className="badge good">{Math.round(progressByPart[active.id]||0)}%</span></div><p className="muted">{active.description}</p><div className="video-wrap"><div id="yt-player" style={{width:'100%',height:'100%'}}/></div>
   <div className="presence"><span className={`dot ${facePresent?'on':''}`}/><div><strong>{cameraState==='denied'?'กล้องไม่พร้อม':facePresent?'ตรวจพบผู้เรียน':'กำลังตรวจสอบผู้เรียน'}</strong><div className="muted small">{facePresent?'Progress กำลังถูกนับ':'Progress จะไม่เพิ่มเมื่อไม่พบใบหน้า'}{missingSeconds>0?` · ไม่พบ ${missingSeconds}s`:''}</div></div></div>
   {message&&<div className="alert">{message}</div>}
   <div className="space"><div style={{flex:1}}><div className="progress-track"><div className="progress-fill" style={{width:`${overall}%`}}/></div><div className="progress-meta"><span>Course progress</span><b>{overall}%</b></div></div>{unlocked?<Link className="btn" href={`/quiz/${course.id}`}>ทำ Post-test →</Link>:<span className="badge warn">เรียนทุก Part ≥ {course.passing_progress}% เพื่อปลดล็อกข้อสอบ</span>}</div>
  </section>
  <aside className="card panel sticky"><div className="eyebrow">PRESENCE CHECK</div><h3>กล้องผู้เรียน</h3><div className="camera-mini"><video ref={cameraRef} muted playsInline/><div className="camera-label">ON-DEVICE · ไม่บันทึกภาพ</div></div><div className="divider"/><h3>เนื้อหาในคอร์ส</h3><div className="part-list">{parts.map(p=><button key={p.id} className={`part-item ${p.id===active.id?'active':''}`} onClick={()=>switchPart(p.id)} style={{color:'inherit',textAlign:'left',width:'100%'}}><strong>{p.order_no}. {p.title}</strong><div className="progress-track"><div className="progress-fill" style={{width:`${progressByPart[p.id]||0}%`}}/></div><div className="progress-meta"><span>{(progressByPart[p.id]||0)>=Number(course.passing_progress)?'ผ่าน':'กำลังเรียน'}</span><b>{Math.round(progressByPart[p.id]||0)}%</b></div></button>)}</div></aside>
 </div>
}
