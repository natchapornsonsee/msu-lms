import {redirect} from "next/navigation";
import AppShell from "@/components/AppShell";
import {createClient} from "@/lib/supabase/server";
import QuizClient from "./QuizClient";

export default async function QuizPage({params}:{params:Promise<{courseId:string}>}){
 const {courseId}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:profile}=await supabase.from('profiles').select('*').eq('id',user.id).single();if(profile?.must_change_password)redirect('/account');
 const {data:course}=await supabase.from('courses').select('id,code,title').eq('id',courseId).single();if(!course)redirect('/dashboard');
 return <AppShell role={profile?.role} name={`${profile?.first_name||''} ${profile?.last_name||''}`.trim()}><div className="page-head"><div><div className="eyebrow">POST-TEST</div><h2>{course.code} · {course.title}</h2></div><span className="badge warn">ทำได้ 1 ครั้ง / รอบการเรียน</span></div><QuizClient courseId={courseId}/></AppShell>
}
