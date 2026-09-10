"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function friendlySignUpError(error:any){
  const code=String(error?.code||"");
  const message=String(error?.message||"");
  if(code==="user_already_exists" || /already registered/i.test(message)) return "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบหรือใช้เมนูลืมรหัสผ่าน";
  if(/email address not authorized/i.test(message)) return "ระบบส่งอีเมลยืนยันยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ";
  if(/rate limit/i.test(message)) return "มีการส่งอีเมลจำนวนมากเกินไป กรุณารอสักครู่แล้วลองใหม่";
  return message || "สมัครใช้งานไม่สำเร็จ กรุณาลองใหม่";
}

export default function RegisterPage(){
  const router=useRouter();
  const [form,setForm]=useState({
    email:"",first_name:"",last_name:"",student_id:"",faculty:"",program:"",year:"",group_name:"",password:"",confirm:""
  });
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [loading,setLoading]=useState(false);
  const set=(key:string,value:string)=>setForm(x=>({...x,[key]:value}));

  async function submit(e:FormEvent){
    e.preventDefault();
    setError(""); setSuccess("");
    const email=form.email.trim().toLowerCase();
    if(form.password.length<8) return setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    if(form.password!==form.confirm) return setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    setLoading(true);
    const supabase=createClient();
    const {data,error}=await supabase.auth.signUp({
      email,
      password:form.password,
      options:{
        emailRedirectTo:`${window.location.origin}/auth/callback?next=/dashboard`,
        data:{
          first_name:form.first_name.trim(),
          last_name:form.last_name.trim(),
          student_id:form.student_id.trim()||null,
          faculty:form.faculty.trim()||null,
          program:form.program.trim()||null,
          year:form.year?Number(form.year):null,
          group_name:form.group_name.trim()||null,
          self_registered:true
        }
      }
    });
    if(error){setLoading(false);return setError(friendlySignUpError(error));}

    if(data.session){
      await fetch("/api/auth/ensure-profile",{method:"POST"}).catch(()=>undefined);
      setLoading(false);
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    setLoading(false);
    setSuccess("สมัครเรียบร้อยแล้ว กรุณาเปิดอีเมลและกดลิงก์ยืนยันบัญชีก่อนเข้าสู่ระบบ");
  }

  return <main className="login-shell">
    <section className="card login-card auth-card-wide">
      <div className="brand-mark">M</div>
      <div className="eyebrow" style={{marginTop:16}}>CREATE ACCOUNT</div>
      <h1>สมัครเข้าใช้งาน</h1>
      <p className="muted">@msu.ac.th จะถูกจัดเป็นผู้เรียน MSU อัตโนมัติ ส่วนอีเมลอื่นจะเป็นผู้เรียนภายนอก</p>
      {error&&<div className="alert">{error}</div>}
      {success&&<div className="alert success">{success}</div>}
      {!success&&<form onSubmit={submit}>
        <div className="field"><label>Email *</label><input type="email" required value={form.email} onChange={e=>set("email",e.target.value)} autoComplete="email" placeholder="name@msu.ac.th" /></div>
        <div className="form-row">
          <div className="field"><label>ชื่อ *</label><input required value={form.first_name} onChange={e=>set("first_name",e.target.value)} /></div>
          <div className="field"><label>นามสกุล *</label><input required value={form.last_name} onChange={e=>set("last_name",e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>รหัสนิสิต</label><input value={form.student_id} onChange={e=>set("student_id",e.target.value)} placeholder="เว้นว่างได้สำหรับบุคคลภายนอก" /></div>
          <div className="field"><label>ชั้นปี</label><input type="number" min="1" max="20" value={form.year} onChange={e=>set("year",e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>คณะ</label><input value={form.faculty} onChange={e=>set("faculty",e.target.value)} /></div>
          <div className="field"><label>สาขา</label><input value={form.program} onChange={e=>set("program",e.target.value)} /></div>
        </div>
        <div className="field"><label>กลุ่ม</label><input value={form.group_name} onChange={e=>set("group_name",e.target.value)} /></div>
        <div className="form-row">
          <div className="field"><label>รหัสผ่าน *</label><input type="password" minLength={8} required value={form.password} onChange={e=>set("password",e.target.value)} autoComplete="new-password" /></div>
          <div className="field"><label>ยืนยันรหัสผ่าน *</label><input type="password" minLength={8} required value={form.confirm} onChange={e=>set("confirm",e.target.value)} autoComplete="new-password" /></div>
        </div>
        <button className="btn" style={{width:"100%"}} disabled={loading}>{loading?"กำลังสมัคร...":"สมัครเข้าใช้งาน"}</button>
      </form>}
      <div className="auth-links"><Link href="/login">← กลับไปหน้าเข้าสู่ระบบ</Link></div>
      <p className="footer-note">การสมัครบัญชีไม่ได้เพิ่มคอร์สให้อัตโนมัติ คอร์สจะปรากฏเมื่อผู้ดูแลระบบเพิ่มผู้ใช้เข้าคอร์ส</p>
    </section>
  </main>;
}
