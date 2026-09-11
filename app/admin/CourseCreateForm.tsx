"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
export default function CourseCreateForm(){
 const router=useRouter(); const [msg,setMsg]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setMsg("");const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());const r=await fetch("/api/admin/courses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)return setMsg(j.error||"เกิดข้อผิดพลาด");(e.target as HTMLFormElement).reset();setMsg("สร้างคอร์สแล้ว");router.refresh();}
 return <><h3>สร้างคอร์สใหม่</h3>{msg&&<div className="alert success">{msg}</div>}<form onSubmit={submit}><div className="form-row"><div className="field"><label>Course code</label><input name="code" required placeholder="HSTE101"/></div><div className="field"><label>เกณฑ์ผ่านการเรียน (%)</label><input name="passing_progress" type="number" min="1" max="100" defaultValue="80"/></div></div><div className="field"><label>ชื่อคอร์ส</label><input name="title" required/></div><div className="field"><label>รายละเอียด</label><textarea name="description"/></div><div className="field"><label>Post-Test URL</label><input name="post_test_url" type="url" placeholder="https://forms.gle/..."/><div className="muted small">ไม่จำเป็นต้องกรอกตอนนี้ สามารถเพิ่มหรือเปลี่ยนลิงก์ภายหลังได้</div></div><button className="btn">สร้างคอร์ส</button></form></>;
}
