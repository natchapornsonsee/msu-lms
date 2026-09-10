import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
export async function POST(req:Request){
 try{
  const {user,admin}=await requireAdmin(); const b=await req.json();
  const code=String(b.code||"").trim().toUpperCase(); const title=String(b.title||"").trim();
  if(!code||!title) return NextResponse.json({error:"กรุณากรอก code และชื่อคอร์ส"},{status:400});
  const {data,error}=await admin.from("courses").insert({code,title,description:String(b.description||""),passing_progress:Number(b.passing_progress||80),created_by:user.id}).select().single();
  if(error) throw error; return NextResponse.json({ok:true,course:data});
 }catch(e:any){return NextResponse.json({error:e.message||"Forbidden"},{status:e.message==='FORBIDDEN'?403:500});}
}
