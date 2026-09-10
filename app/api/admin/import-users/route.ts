import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/auth";

function s(v:any){return v==null?"":String(v).trim()}
function randomPassword(){return `Msu!${randomBytes(6).toString("base64url")}`}
export async function POST(req:Request){
 try{
  const {admin}=await requireAdmin(); const fd=await req.formData(); const file=fd.get("file") as File|null;
  if(!file) return NextResponse.json({error:"ไม่พบไฟล์"},{status:400});
  const wb=new ExcelJS.Workbook(); await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as any); const ws=wb.worksheets[0];
  if(!ws) return NextResponse.json({error:"ไม่พบ worksheet"},{status:400});
  const headers=new Map<string,number>(); ws.getRow(1).eachCell((cell,col)=>headers.set(s(cell.value).toLowerCase(),col));
  const need=["email","first_name","last_name"]; for(const h of need) if(!headers.has(h)) return NextResponse.json({error:`ขาดคอลัมน์ ${h}`},{status:400});
  const results:any[]=[];
  for(let r=2;r<=ws.rowCount;r++){
   const row=ws.getRow(r); const get=(h:string)=>s(row.getCell(headers.get(h)||999).value); const email=get("email").toLowerCase(); if(!email) continue;
   const isMsu=email.endsWith("@msu.ac.th"); const role=isMsu?"student":"external"; const supplied=get("temporary_password"); const password=supplied||randomPassword();
   let uid:string|undefined;
   const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{first_name:get("first_name"),last_name:get("last_name")}});
   if(created.error){
    const listed=await admin.auth.admin.listUsers({page:1,perPage:1000}); const found=listed.data?.users.find(u=>u.email?.toLowerCase()===email); uid=found?.id;
    if(!uid){results.push({email,status:`ERROR: ${created.error.message}`});continue;}
   } else uid=created.data.user.id;
   const {data:existingProfile}=await admin.from("profiles").select("role").eq("id",uid).maybeSingle();
   if(existingProfile?.role==="admin"){results.push({email,status:"SKIPPED: admin account"});continue;}
   const profile={id:uid,email,role,first_name:get("first_name"),last_name:get("last_name"),student_id:get("student_id")||null,faculty:get("faculty")||null,program:get("program")||null,year:get("year")?Number(get("year")):null,group_name:get("group_name")||null,must_change_password:true};
   const up=await admin.from("profiles").upsert(profile); if(up.error){results.push({email,status:`ERROR: ${up.error.message}`});continue;}
   const codes=get("course_codes").split(/[,;]+/).map(x=>x.trim()).filter(Boolean);
   for(const code of codes){const {data:c}=await admin.from("courses").select("id").eq("code",code.toUpperCase()).maybeSingle(); if(c) await admin.from("enrollments").upsert({user_id:uid,course_id:c.id},{onConflict:"user_id,course_id"});}
   results.push({email,status:created.error?"updated existing":"created",temporary_password:created.error?"(unchanged)":password});
  }
  return NextResponse.json({ok:true,results});
 }catch(e:any){return NextResponse.json({error:e.message||"Import failed"},{status:500});}
}
