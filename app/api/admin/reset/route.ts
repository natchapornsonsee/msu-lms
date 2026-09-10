import {NextResponse} from "next/server"; import {requireAdmin} from "@/lib/auth";
export async function POST(req:Request){
 try{const {user,admin}=await requireAdmin();const b=await req.json();
  if(b.scope==='global'){
   const {data:ens,error}=await admin.from('enrollments').select('*');if(error)throw error;
   for(const en of ens||[]){const next=en.reset_count+1;await admin.from('enrollments').update({reset_count:next}).eq('id',en.id);await admin.from('reset_audit').insert({admin_id:user.id,user_id:en.user_id,course_id:en.course_id,previous_attempt_no:en.reset_count,new_attempt_no:next,scope:'all'});}
   return NextResponse.json({ok:true,count:ens?.length||0});
  }
  const courseId=String(b.course_id||'');if(!courseId)return NextResponse.json({error:'course_id required'},{status:400});
  if(b.scope==='all'){
   const {data:ens,error}=await admin.from('enrollments').select('*').eq('course_id',courseId);if(error)throw error;
   for(const en of ens||[]){const next=en.reset_count+1;await admin.from('enrollments').update({reset_count:next}).eq('id',en.id);await admin.from('reset_audit').insert({admin_id:user.id,user_id:en.user_id,course_id:courseId,previous_attempt_no:en.reset_count,new_attempt_no:next,scope:'all'});}
  }else{
   const userId=String(b.user_id||'');const {data:en,error}=await admin.from('enrollments').select('*').eq('user_id',userId).eq('course_id',courseId).single();if(error)throw error;const next=en.reset_count+1;await admin.from('enrollments').update({reset_count:next}).eq('id',en.id);await admin.from('reset_audit').insert({admin_id:user.id,user_id:userId,course_id:courseId,previous_attempt_no:en.reset_count,new_attempt_no:next,scope:'user'});
  }
  return NextResponse.json({ok:true});
 }catch(e:any){return NextResponse.json({error:e.message||'reset failed'},{status:500});}
}
