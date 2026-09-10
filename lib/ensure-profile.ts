import type {User} from "@supabase/supabase-js";
import {createAdminClient} from "@/lib/supabase/admin";

function text(value:unknown){return typeof value==="string"?value.trim():"";}
function numberOrNull(value:unknown){const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}

export async function ensureUserProfile(user:User){
 const admin=createAdminClient();
 const email=(user.email||"").trim().toLowerCase();
 if(!email) throw new Error("User email missing");
 const meta=(user.user_metadata||{}) as Record<string,unknown>;
 const {data:existing,error:readError}=await admin.from("profiles").select("*").eq("id",user.id).maybeSingle();
 if(readError) throw readError;

 const inferredRole=email.endsWith("@msu.ac.th")?"student":"external";
 const profile={
  id:user.id,
  email,
  role:existing?.role||inferredRole,
  first_name:existing?.first_name||text(meta.first_name),
  last_name:existing?.last_name||text(meta.last_name),
  student_id:existing?.student_id||text(meta.student_id)||null,
  faculty:existing?.faculty||text(meta.faculty)||null,
  program:existing?.program||text(meta.program)||null,
  year:existing?.year||numberOrNull(meta.year),
  group_name:existing?.group_name||text(meta.group_name)||null,
  // Self-registered users chose their own password. Imported accounts keep the
  // existing must_change_password flag from the admin import workflow.
  must_change_password:existing?Boolean(existing.must_change_password):false,
  updated_at:new Date().toISOString()
 };
 const {error}=await admin.from("profiles").upsert(profile,{onConflict:"id"});
 if(error) throw error;
 return profile;
}
