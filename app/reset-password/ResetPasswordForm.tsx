"use client";
import Link from "next/link";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";

export default function ResetPasswordForm(){
 const router=useRouter();
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [error,setError]=useState("");
 const [success,setSuccess]=useState(false);
 const [loading,setLoading]=useState(false);
 async function submit(e:FormEvent){
  e.preventDefault();setError("");
  if(password.length<8)return setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  if(password!==confirm)return setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
  setLoading(true);
  const supabase=createClient();
  const {error}=await supabase.auth.updateUser({password});
  if(error){setLoading(false);return setError(error.message||"เปลี่ยนรหัสผ่านไม่สำเร็จ");}
  await fetch("/api/account/password-changed",{method:"POST"}).catch(()=>undefined);
  setLoading(false);setSuccess(true);
 }
 if(success)return <>
  <div className="alert success">ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว</div>
  <button className="btn" style={{width:"100%"}} onClick={()=>{router.replace("/dashboard");router.refresh();}}>เข้าสู่ระบบต่อ →</button>
 </>;
 return <form onSubmit={submit}>
  {error&&<div className="alert">{error}</div>}
  <div className="field"><label>รหัสผ่านใหม่</label><input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" /></div>
  <div className="field"><label>ยืนยันรหัสผ่านใหม่</label><input type="password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" /></div>
  <button className="btn" style={{width:"100%"}} disabled={loading}>{loading?"กำลังบันทึก...":"บันทึกรหัสผ่านใหม่"}</button>
  <div className="auth-links"><Link href="/login">กลับไปหน้าเข้าสู่ระบบ</Link></div>
 </form>;
}
