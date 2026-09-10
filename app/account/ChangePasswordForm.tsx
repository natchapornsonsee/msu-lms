"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordForm({mustChange}:{mustChange:boolean}) {
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [msg,setMsg]=useState("");
  async function submit(e:FormEvent){
    e.preventDefault(); setMsg("");
    if(password.length<8) return setMsg("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    if(password!==confirm) return setMsg("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    const supabase=createClient();
    const {error}=await supabase.auth.updateUser({password});
    if(error) return setMsg(error.message);
    await fetch("/api/account/password-changed",{method:"POST"});
    setPassword(""); setConfirm(""); setMsg("เปลี่ยนรหัสผ่านเรียบร้อย");
  }
  return <>
    <h3>เปลี่ยนรหัสผ่าน</h3>
    {mustChange && <div className="alert">บัญชีนี้ใช้รหัสผ่านชั่วคราว กรุณาเปลี่ยนรหัสผ่านก่อนใช้งานต่อ</div>}
    {msg && <div className="alert success">{msg}</div>}
    <form onSubmit={submit}>
      <div className="field"><label>รหัสผ่านใหม่</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
      <div className="field"><label>ยืนยันรหัสผ่าน</label><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required /></div>
      <button className="btn">บันทึกรหัสผ่าน</button>
    </form>
  </>;
}
