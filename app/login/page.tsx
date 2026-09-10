"use client";
import Link from "next/link";
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
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setLoading(false);
      if (error.code === "email_not_confirmed") {
        return setError("อีเมลนี้ยังไม่ได้ยืนยัน กรุณาเปิดอีเมลยืนยันการสมัครก่อนเข้าสู่ระบบ");
      }
      return setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    // Creates a missing profile for self-registered accounts and never downgrades
    // existing admin/imported-user profiles.
    await fetch("/api/auth/ensure-profile", { method: "POST" }).catch(() => undefined);
    setLoading(false);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="login-shell">
      <section className="card login-card">
        <div className="brand-mark">M</div>
        <div className="eyebrow" style={{marginTop:16}}>MSU FUTURE LEARNING</div>
        <h1>เข้าสู่ระบบเรียนออนไลน์</h1>
        <p className="muted">นิสิตใช้ Email @msu.ac.th ส่วนบุคคลภายนอกสามารถใช้อีเมลทั่วไปได้</p>
        {error && <div className="alert">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@msu.ac.th" autoComplete="email" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button className="btn" style={{width:"100%"}} disabled={loading}>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
        </form>

        <div className="auth-links">
          <Link href="/forgot-password">ลืมรหัสผ่าน?</Link>
          <span className="muted">•</span>
          <Link href="/register">สมัครเข้าใช้งาน</Link>
        </div>

        <p className="footer-note">ระบบไม่บันทึกภาพจากกล้อง กล้องถูกใช้เพื่อตรวจว่ามีใบหน้าอยู่หน้าจอขณะวิดีโอกำลังเล่นเท่านั้น</p>
      </section>
    </main>
  );
}
