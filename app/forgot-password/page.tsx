"use client";
import Link from "next/link";
import {FormEvent,useState} from "react";
import {createClient} from "@/lib/supabase/client";

export default function ForgotPasswordPage(){
 const [email,setEmail]=useState("");
 const [error,setError]=useState("");
 const [sent,setSent]=useState(false);
 const [loading,setLoading]=useState(false);
 async function submit(e:FormEvent){
  e.preventDefault();setError("");setLoading(true);
  const supabase=createClient();
  const {error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{
   redirectTo:`${window.location.origin}/auth/callback?next=/reset-password`
  });
  setLoading(false);
  if(error){
   const message=String(error.message||"");
   if(/email address not authorized/i.test(message)) return setError("ระบบส่งอีเมลกู้รหัสผ่านยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ");
   if(/rate limit/i.test(message)) return setError("ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่");
   return setError("ไม่สามารถส่งอีเมลกู้รหัสผ่านได้ กรุณาลองใหม่อีกครั้ง");
  }
  // Keep this generic to avoid revealing whether an account exists.
  setSent(true);
 }
 return <main className="login-shell"><section className="card login-card">
  <div className="brand-mark">M</div><div className="eyebrow" style={{marginTop:16}}>PASSWORD RECOVERY</div>
  <h1>ลืมรหัสผ่าน</h1>
  <p className="muted">กรอกอีเมลที่ใช้ในระบบ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่</p>
  {error&&<div className="alert">{error}</div>}
  {sent?<div className="alert success">หากอีเมลนี้มีบัญชีอยู่ในระบบ ลิงก์ตั้งรหัสผ่านใหม่จะถูกส่งไปยังอีเมล กรุณาตรวจ Inbox และ Spam</div>:
  <form onSubmit={submit}>
   <div className="field"><label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></div>
   <button className="btn" style={{width:"100%"}} disabled={loading}>{loading?"กำลังส่ง...":"ส่งลิงก์ตั้งรหัสผ่านใหม่"}</button>
  </form>}
  <div className="auth-links"><Link href="/login">← กลับไปหน้าเข้าสู่ระบบ</Link></div>
 </section></main>;
}
