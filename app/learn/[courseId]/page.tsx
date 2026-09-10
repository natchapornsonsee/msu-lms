import {redirect} from "next/navigation";
import AppShell from "@/components/AppShell";
import {createClient} from "@/lib/supabase/server";
import LearningClient from "./LearningClient";

export default async function LearnPage({params,searchParams}:{params:Promise<{courseId:string}>,searchParams:Promise<{part?:string}>}){
  const {courseId}=await params; const {part:requestedPart}=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/login');
  const {data:profile}=await supabase.from('profiles').select('*').eq('id',user.id).single();
  if(profile?.must_change_password)redirect('/account');
  const {data:en}=await supabase.from('enrollments').select('*').eq('user_id',user.id).eq('course_id',courseId).single();
  if(!en)redirect('/dashboard');
  const {data:course}=await supabase.from('courses').select('*').eq('id',courseId).single();
  if(!course)redirect('/dashboard');
  const {data:parts}=await supabase.from('course_parts').select('*').eq('course_id',courseId).order('order_no');
  const ids=(parts||[]).map((p:any)=>p.id);
  let progress:any[]=[];
  if(ids.length){const r=await supabase.from('lesson_progress').select('*').eq('user_id',user.id).eq('attempt_no',en.reset_count).in('part_id',ids);progress=r.data||[];}
  const pMap=new Map(progress.map((p:any)=>[p.part_id,p]));
  const initial=(parts||[]).map((p:any)=>({...p,progress:pMap.get(p.id)||null}));
  return <AppShell role={profile?.role} name={`${profile?.first_name||''} ${profile?.last_name||''}`.trim()}>
    <div className="page-head"><div><div className="eyebrow">LEARNING SESSION</div><h2>{course.code} · {course.title}</h2></div><span className="badge">เกณฑ์ผ่าน {course.passing_progress}% / Part</span></div>
    {initial.length?<LearningClient course={course} parts={initial} initialPartId={initial.some((p:any)=>p.id===requestedPart)?requestedPart:undefined}/>:<div className="card panel">คอร์สนี้ยังไม่มีวิดีโอ</div>}
  </AppShell>
}
