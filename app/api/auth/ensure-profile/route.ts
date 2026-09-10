import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {ensureUserProfile} from "@/lib/ensure-profile";

export async function POST(){
 try{
  const {user}=await requireUser();
  const profile=await ensureUserProfile(user);
  return NextResponse.json({ok:true,role:profile.role});
 }catch(e:any){
  return NextResponse.json({error:e?.message||"Unable to create profile"},{status:e?.message==="UNAUTHORIZED"?401:500});
 }
}
