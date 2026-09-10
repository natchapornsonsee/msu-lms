"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="login-shell">
      <section className="card login-card">
        <div className="brand-mark">M</div>
        <div className="eyebrow" style={{marginTop:16}}>MSU FUTURE LEARNING</div>
        <h1>เข้าสู่ระบบเรียนออนไลน์</h1>
        <p className="muted">นิสิตใช้ Email @msu.ac.th ส่วนบุคคลภายนอกใช้อีเมลที่ผู้ดูแลระบบลงทะเบียนไว้</p>
        {error && <div className="alert">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@msu.ac.th" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <button className="btn" style={{width:"100%"}} disabled={loading}>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
        </form>
        <p className="footer-note">ระบบไม่บันทึกภาพจากกล้องใน V0.1 กล้องถูกใช้เพื่อตรวจว่ามีใบหน้าอยู่หน้าจอขณะวิดีโอกำลังเล่นเท่านั้น</p>
      </section>
    </main>
  );
}
