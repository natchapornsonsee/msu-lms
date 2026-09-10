import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.must_change_password) redirect("/account");

  const { data: enrollments } = await supabase.from("enrollments").select("*").eq("user_id", user.id).order("enrolled_at");
  const rows = [] as any[];
  for (const en of enrollments ?? []) {
    const { data: course } = await supabase.from("courses").select("*").eq("id", en.course_id).single();
    if (!course) continue;
    const { data: parts } = await supabase.from("course_parts").select("*").eq("course_id", course.id).order("order_no");
    const partIds = (parts ?? []).map((p:any)=>p.id);
    let progress:any[] = [];
    if (partIds.length) {
      const res = await supabase.from("lesson_progress").select("*").eq("user_id", user.id).eq("attempt_no", en.reset_count).in("part_id", partIds);
      progress = res.data ?? [];
    }
    const progressByPart = new Map(progress.map((p:any)=>[p.part_id, Number(p.progress_pct)]));
    const partStatus = (parts ?? []).map((p:any)=>({ ...p, progress: progressByPart.get(p.id) ?? 0 }));
    const avg = partStatus.length ? Math.round(partStatus.reduce((s:number,p:any)=>s+p.progress,0)/partStatus.length) : 0;
    const unlocked = partStatus.length > 0 && partStatus.every((p:any)=>p.progress >= Number(course.passing_progress));
    const { data: attempt } = await supabase.from("quiz_attempts").select("score,status").eq("user_id", user.id).eq("course_id", course.id).eq("attempt_no", en.reset_count).maybeSingle();
    rows.push({ course, en, parts: partStatus, avg, unlocked, attempt });
  }

  const completed = rows.filter(r=>r.unlocked).length;
  const avgOverall = rows.length ? Math.round(rows.reduce((s,r)=>s+r.avg,0)/rows.length) : 0;
  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : user.email ?? "Learner";

  return (
    <AppShell role={profile?.role} name={name}>
      <section className="hero">
        <div className="card hero-main">
          <div className="eyebrow">LEARNING COMMAND CENTER</div>
          <h2>สวัสดี {profile?.first_name || "ผู้เรียน"}<br/>เรียนต่อจากจุดเดิมได้ทันที</h2>
          <p className="muted">ระบบจะนับ Progress เฉพาะช่วงที่วิดีโอกำลังเล่น หน้านี้ยังเปิดอยู่ และตรวจพบใบหน้าผ่านกล้อง</p>
        </div>
        <div className="card stats">
          <div className="stat"><span className="muted small">คอร์สทั้งหมด</span><b>{rows.length}</b></div>
          <div className="stat"><span className="muted small">ผ่านเกณฑ์เรียน</span><b>{completed}</b></div>
          <div className="stat"><span className="muted small">Progress เฉลี่ย</span><b>{avgOverall}%</b></div>
          <div className="stat"><span className="muted small">สอบแล้ว</span><b>{rows.filter(r=>r.attempt?.status==='submitted').length}</b></div>
        </div>
      </section>

      <div className="section-title"><div><div className="eyebrow">MY COURSES</div><h3>คอร์สของฉัน</h3></div></div>
      {rows.length === 0 ? <div className="card panel"><p className="muted">ยังไม่มีคอร์สที่ได้รับมอบหมาย กรุณาติดต่อผู้ดูแลระบบ</p></div> :
      <section className="grid">
        {rows.map(({course,parts,avg,unlocked,attempt})=><article className="card course-card" key={course.id}>
          <div className="space"><span className="course-code">{course.code}</span>{unlocked?<span className="badge good">เรียนครบเกณฑ์</span>:<span className="badge warn">กำลังเรียน</span>}</div>
          <h3>{course.title}</h3>
          <p>{course.description}</p>
          <div className="progress-track"><div className="progress-fill" style={{width:`${avg}%`}} /></div>
          <div className="progress-meta"><span>Course progress</span><strong>{avg}%</strong></div>
          <div className="part-list" style={{marginBottom:14}}>{parts.map((p:any)=><div className="part-item" key={p.id}><div className="space"><div><strong>{p.order_no}. {p.title}</strong><span className="muted small">Progress {Math.round(p.progress)}%</span></div><Link className="ghost-btn" href={`/learn/${course.id}?part=${p.id}`}>{p.progress>0?"เรียนต่อ":"เริ่มเรียน"}</Link></div></div>)}</div>
          <div className="inline">
            <Link className="btn" href={`/learn/${course.id}`}>{avg > 0 ? "เปิดคอร์ส" : "เริ่มคอร์ส"}</Link>
            {unlocked && attempt?.status !== 'submitted' && <Link className="btn btn-secondary" href={`/quiz/${course.id}`}>{attempt?.status === 'in_progress' ? 'ทำแบบทดสอบต่อ' : 'ทำแบบทดสอบ'}</Link>}
            {attempt?.status === 'submitted' && <span className="badge good">คะแนน {Number(attempt.score).toFixed(0)}%</span>}
          </div>
        </article>)}
      </section>}
    </AppShell>
  );
}
