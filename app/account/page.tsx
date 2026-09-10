import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const name = profile ? `${profile.first_name} ${profile.last_name}` : user.email ?? "User";
  return (
    <AppShell role={profile?.role} name={name}>
      <div className="page-head"><div><div className="eyebrow">ACCOUNT</div><h2>บัญชีผู้ใช้</h2></div></div>
      <div className="two-col">
        <section className="card panel">
          <h3>ข้อมูลผู้เรียน</h3>
          <div className="table-wrap"><table className="table"><tbody>
            <tr><th>Email</th><td>{user.email}</td></tr>
            <tr><th>ชื่อ</th><td>{profile?.first_name} {profile?.last_name}</td></tr>
            <tr><th>รหัสนิสิต</th><td>{profile?.student_id || "-"}</td></tr>
            <tr><th>คณะ / สาขา</th><td>{profile?.faculty || "-"} / {profile?.program || "-"}</td></tr>
            <tr><th>ชั้นปี / กลุ่ม</th><td>{profile?.year || "-"} / {profile?.group_name || "-"}</td></tr>
          </tbody></table></div>
        </section>
        <section className="card panel"><ChangePasswordForm mustChange={Boolean(profile?.must_change_password)} /></section>
      </div>
    </AppShell>
  );
}
