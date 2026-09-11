import {redirect} from "next/navigation";
import AppShell from "@/components/AppShell";
import {createClient} from "@/lib/supabase/server";
import CourseEditor from "./CourseEditor";

export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect('/login');
 const {data:profile}=await supabase.from('profiles').select('*').eq('id',user.id).single(); if(profile?.role!=='admin')redirect('/dashboard');
 const {data:course}=await supabase.from('courses').select('*').eq('id',id).single(); if(!course)redirect('/admin');
 const {data:parts}=await supabase.from('course_parts').select('*').eq('course_id',id).order('order_no');
 const {data:users}=await supabase.from('profiles').select('id,email,first_name,last_name,student_id').neq('role','admin').order('first_name');
 const {data:enrollments}=await supabase.from('enrollments').select('*').eq('course_id',id);
 return <AppShell role="admin" name={`${profile.first_name} ${profile.last_name}`}>
  <div className="page-head"><div><div className="eyebrow">COURSE CONTROL</div><h2>{course.code} · {course.title}</h2></div></div>
  <CourseEditor course={course} parts={parts||[]} users={users||[]} enrollments={enrollments||[]} />
 </AppShell>
}
