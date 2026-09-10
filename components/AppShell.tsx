import Link from "next/link";
import SignOutButton from "./SignOutButton";

export default function AppShell({
  children,
  role,
  name,
}: {
  children: React.ReactNode;
  role?: string;
  name?: string;
}) {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <h1>MSU Future Learning</h1>
            <p>{name ? `${name} · ${role ?? "learner"}` : "Presence-aware LMS"}</p>
          </div>
        </div>
        <nav className="nav">
          <Link href="/dashboard">Dashboard</Link>
          {role === "admin" && <Link href="/admin">Admin</Link>}
          <Link href="/account">Account</Link>
          <SignOutButton />
        </nav>
      </header>
      {children}
    </main>
  );
}
