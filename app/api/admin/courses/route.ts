import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

function normalizePostTestUrl(value:unknown){
 const text=String(value??"").trim();
 if(!text)return null;
 try{
  const url=new URL(text);
  if(url.protocol!=="https:")throw new Error();
  return url.toString();
 }catch{throw new Error("POST_TEST_URL_INVALID");}
}

export async function POST(req:Request){
 try{
  const {user,admin}=await requireAdmin(); const b=await req.json();
  const code=String(b.code||"").trim().toUpperCase(); const title=String(b.title||"").trim();
  if(!code||!title) return NextResponse.json({error:"กรุณากรอก code และชื่อคอร์ส"},{status:400});
  const postTestUrl=normalizePostTestUrl(b.post_test_url);
  const {data,error}=await admin.from("courses").insert({code,title,description:String(b.description||""),passing_progress:Number(b.passing_progress||80),post_test_url:postTestUrl,created_by:user.id}).select().single();
  if(error) throw error; return NextResponse.json({ok:true,course:data});
 }catch(e:any){
  const invalidUrl=e?.message==="POST_TEST_URL_INVALID";
  return NextResponse.json({error:invalidUrl?"Post-Test URL ไม่ถูกต้อง กรุณาใช้ลิงก์ https://":e.message||"Forbidden"},{status:invalidUrl?400:e.message==='FORBIDDEN'?403:500});
 }
}
