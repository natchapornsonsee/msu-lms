import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
export async function POST(){
  try{
    const {user}=await requireUser();
    const admin=createAdminClient();
    const {error}=await admin.from("profiles").update({must_change_password:false,updated_at:new Date().toISOString()}).eq("id",user.id);
    if(error)throw error;
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:"Unauthorized"},{status:401});}
}
