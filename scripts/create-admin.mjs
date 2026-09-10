import { createClient } from '@supabase/supabase-js';

const [email,password,firstName='Admin',lastName='LMS'] = process.argv.slice(2);
if(!email || !password){
  console.error('Usage: npm run bootstrap-admin -- admin@msu.ac.th "StrongPassword" "First" "Last"');
  process.exit(1);
}
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');process.exit(1);}
const supabase=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
let {data,error}=await supabase.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{first_name:firstName,last_name:lastName}});
let user=data?.user;
if(error){
  const list=await supabase.auth.admin.listUsers({page:1,perPage:1000});
  user=list.data?.users.find(u=>u.email?.toLowerCase()===email.toLowerCase());
  if(!user){console.error(error.message);process.exit(1);}
}
const up=await supabase.from('profiles').upsert({id:user.id,email:user.email,role:'admin',first_name:firstName,last_name:lastName,must_change_password:false});
if(up.error){console.error(up.error.message);process.exit(1);}
console.log(`Admin ready: ${user.email}`);
