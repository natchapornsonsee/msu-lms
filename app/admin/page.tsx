import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import AdminUserImport from "./AdminUserImport";
import CourseCreateForm from "./CourseCreateForm";
import GlobalResetButton from "./GlobalResetButton";

export default async function AdminPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login");
  const {data:profile}=await supabase.from("profiles").select("*").eq("id",user.id).single();
  if(profile?.role!=="admin") redirect("/dashboard");
  const {data:courses}=await supabase.from("courses").select("*").order("created_at",{ascending:false});
  const {count:userCount}=await supabase.from("profiles").select("id",{count:"exact",head:true});
  const {count:enrollCount}=await supabase.from("enrollments").select("id",{count:"exact",head:true});
  return <AppShell role="admin" name={`${profile.first_name} ${profile.last_name}`}>
    <div className="page-head"><div><div className="eyebrow">ADMIN CONTROL</div><h2>จัดการระบบเรียนออนไลน์</h2></div><div className="inline"><a className="btn" href="/api/admin/export">Export Excel</a><GlobalResetButton /></div></div>
    <div className="kpi-grid">
      <div className="card kpi"><span>ผู้ใช้ทั้งหมด</span><b>{userCount??0}</b></div>
      <div className="card kpi"><span>คอร์ส</span><b>{courses?.length??0}</b></div>
      <div className="card kpi"><span>การลงทะเบียน</span><b>{enrollCount??0}</b></div>
      <div className="card kpi"><span>Post-Test พร้อมใช้</span><b>{(courses??[]).filter((c:any)=>Boolean(c.post_test_url)).length}</b></div>
    </div>
    <div className="two-col">
      <section className="card panel">
        <div className="space"><div><div className="eyebrow">COURSES</div><h3>คอร์สทั้งหมด</h3></div></div>
        <div className="table-wrap"><table className="table"><thead><tr><th>Code</th><th>ชื่อคอร์ส</th><th>เกณฑ์</th><th>Post-Test</th><th>สถานะ</th><th></th></tr></thead><tbody>
          {(courses??[]).map((c:any)=><tr key={c.id}><td>{c.code}</td><td>{c.title}</td><td>{c.passing_progress}%</td><td>{c.post_test_url?<span className="badge good">พร้อม</span>:<span className="badge warn">ยังไม่แนบ</span>}</td><td>{c.is_published?<span className="badge good">Published</span>:<span className="badge warn">Draft</span>}</td><td><Link href={`/admin/courses/${c.id}`}>จัดการ →</Link></td></tr>)}
        </tbody></table></div>
        <div className="divider" />
        <CourseCreateForm />
      </section>
      <section className="card panel"><AdminUserImport /></section>
    </div>
  </AppShell>
}
