import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";

function normalizePostTestUrl(value:unknown){
 const text=String(value??"").trim();
 if(!text)return null;
 try{
  const url=new URL(text);
  if(url.protocol!=="https:")throw new Error();
  return url.toString();
 }catch{throw new Error("POST_TEST_URL_INVALID");}
}

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const {admin}=await requireAdmin();
  const b=await req.json();
  const payload={
   code:String(b.code||'').trim().toUpperCase(),
   title:String(b.title||'').trim(),
   description:String(b.description||''),
   passing_progress:Number(b.passing_progress||80),
   post_test_url:normalizePostTestUrl(b.post_test_url),
   is_published:b.is_published==='on'||b.is_published===true,
   updated_at:new Date().toISOString()
  };
  const {error}=await admin.from('courses').update(payload).eq('id',id);
  if(error)throw error;
  return NextResponse.json({ok:true});
 }catch(e:any){
  const invalidUrl=e?.message==="POST_TEST_URL_INVALID";
  return NextResponse.json({error:invalidUrl?"Post-Test URL ไม่ถูกต้อง กรุณาใช้ลิงก์ https://":e.message},{status:invalidUrl?400:500});
 }
}
