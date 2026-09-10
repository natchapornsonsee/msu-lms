import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic="force-dynamic";

export default async function ResetPasswordPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 return <main className="login-shell"><section className="card login-card">
  <div className="brand-mark">M</div><div className="eyebrow" style={{marginTop:16}}>NEW PASSWORD</div>
  <h1>ตั้งรหัสผ่านใหม่</h1>
  {user?<><p className="muted">กำหนดรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร</p><ResetPasswordForm/></>:
   <><div className="alert">ลิงก์กู้รหัสผ่านไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่อีกครั้ง</div><div className="auth-links"><Link href="/forgot-password">ขอลิงก์ใหม่</Link><span className="muted">•</span><Link href="/login">เข้าสู่ระบบ</Link></div></>}
 </section></main>;
}
