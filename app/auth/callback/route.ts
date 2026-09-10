import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {ensureUserProfile} from "@/lib/ensure-profile";

function safeNext(value:string|null){
 if(!value||!value.startsWith("/")||value.startsWith("//")) return "/dashboard";
 return value;
}

export async function GET(request:NextRequest){
 const url=new URL(request.url);
 const code=url.searchParams.get("code");
 const next=safeNext(url.searchParams.get("next"));
 if(!code) return NextResponse.redirect(new URL("/login",url.origin));

 const supabase=await createClient();
 const {error}=await supabase.auth.exchangeCodeForSession(code);
 if(error) return NextResponse.redirect(new URL("/login",url.origin));

 const {data:{user}}=await supabase.auth.getUser();
 if(user){
  try{await ensureUserProfile(user);}catch(error){console.error("ensureUserProfile after auth callback failed",error);}
 }
 return NextResponse.redirect(new URL(next,url.origin));
}
