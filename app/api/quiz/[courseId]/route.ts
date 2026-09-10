import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";

function shuffle<T>(arr:T[]){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

async function gate(userId:string,courseId:string){
 const admin=createAdminClient();
 const {data:en}=await admin.from('enrollments').select('*').eq('user_id',userId).eq('course_id',courseId).maybeSingle();
 if(!en) return {ok:false,status:403,error:'Not enrolled'} as const;
 const {data:course}=await admin.from('courses').select('*').eq('id',courseId).maybeSingle();
 if(!course) return {ok:false,status:404,error:'Course not found'} as const;
 const {data:parts}=await admin.from('course_parts').select('id').eq('course_id',courseId);
 if(!parts?.length) return {ok:false,status:403,error:'Course has no learning parts'} as const;
 const ids=parts.map(p=>p.id);
 const {data:progress}=await admin.from('lesson_progress').select('part_id,progress_pct').eq('user_id',userId).eq('attempt_no',en.reset_count).in('part_id',ids);
 const map=new Map<string,number>((progress||[]).map((p:any)=>[String(p.part_id),Number(p.progress_pct)] as [string,number]));
 const complete=ids.every(id=>(map.get(id)||0)>=Number(course.passing_progress));
 if(!complete) return {ok:false,status:403,error:`ต้องเรียนทุก Part ให้ครบอย่างน้อย ${course.passing_progress}% ก่อนทำแบบทดสอบ`} as const;
 return {ok:true,admin,en,course} as const;
}

export async function GET(_:Request,{params}:{params:Promise<{courseId:string}>}){
 try{const {user}=await requireUser();const {courseId}=await params;const g=await gate(user.id,courseId);if(!g.ok)return NextResponse.json({error:g.error},{status:g.status});
  const {admin,en}=g;const {data:existing}=await admin.from('quiz_attempts').select('*').eq('user_id',user.id).eq('course_id',courseId).eq('attempt_no',en.reset_count).maybeSingle();
  if(existing?.status==='submitted')return NextResponse.json({status:'submitted',score:Number(existing.score),correct_answers:existing.correct_answers,total_questions:existing.total_questions});
  if(existing)return NextResponse.json({status:'in_progress',questions:existing.question_snapshot});
  const {data:qs}=await admin.from('quiz_questions').select('id,question_text,option_a,option_b,option_c,option_d').eq('course_id',courseId).eq('is_active',true).order('order_no');
  if(!qs?.length)return NextResponse.json({error:'คอร์สนี้ยังไม่มีข้อสอบ'},{status:404});
  const snapshot=shuffle(qs).map((q:any)=>({id:q.id,prompt:q.question_text,options:shuffle([{key:'A',text:q.option_a},{key:'B',text:q.option_b},{key:'C',text:q.option_c},{key:'D',text:q.option_d}])}));
  const {error}=await admin.from('quiz_attempts').insert({user_id:user.id,course_id:courseId,attempt_no:en.reset_count,status:'in_progress',question_snapshot:snapshot});if(error)throw error;
  return NextResponse.json({status:'in_progress',questions:snapshot});
 }catch(e:any){return NextResponse.json({error:e.message||'Quiz error'},{status:500});}
}

export async function POST(req:Request,{params}:{params:Promise<{courseId:string}>}){
 try{const {user}=await requireUser();const {courseId}=await params;const g=await gate(user.id,courseId);if(!g.ok)return NextResponse.json({error:g.error},{status:g.status});const {admin,en}=g;const b=await req.json();const answers=b.answers||{};
  const {data:attempt}=await admin.from('quiz_attempts').select('*').eq('user_id',user.id).eq('course_id',courseId).eq('attempt_no',en.reset_count).single();if(!attempt)return NextResponse.json({error:'ยังไม่ได้เริ่มข้อสอบ'},{status:400});if(attempt.status==='submitted')return NextResponse.json({error:'แบบทดสอบรอบนี้ถูกส่งไปแล้ว ต้องให้ Admin Reset ก่อนจึงจะทำใหม่ได้'},{status:409});
  const ids=(attempt.question_snapshot||[]).map((q:any)=>q.id);const {data:keys}=await admin.from('quiz_questions').select('id,correct_option').in('id',ids);const correctMap=new Map((keys||[]).map((q:any)=>[q.id,q.correct_option]));let correct=0;for(const id of ids)if(String(answers[id]||'').toUpperCase()===correctMap.get(id))correct++;const total=ids.length;const score=total?Math.round((correct/total)*10000)/100:0;
  const {error}=await admin.from('quiz_attempts').update({status:'submitted',answers,score,total_questions:total,correct_answers:correct,submitted_at:new Date().toISOString()}).eq('id',attempt.id);if(error)throw error;return NextResponse.json({ok:true,score,correct_answers:correct,total_questions:total});
 }catch(e:any){return NextResponse.json({error:e.message||'Submit failed'},{status:500});}
}
