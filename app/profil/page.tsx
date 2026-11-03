import { BottomNav } from "@/components/BottomNav";
import { fullName, initials, requireMember } from "@/lib/member";
import { signOut } from "../prijava/actions";

export default async function ProfilPage() {
  const { user, member } = await requireMember();

  return (
    <>
      <main className="page" style={{ paddingBottom: 120 }}>
        <h1 className="display">Profil</h1>
        <div className="card row">
          <span className="avatar" style={{ width: 56, height: 56, borderRadius: 28, fontSize: 20 }}>
            {initials(member)}
          </span>
          <div className="stack" style={{ gap: 2 }}>
            <strong style={{ fontSize: 18 }}>
              {fullName(member)} {member.role === "admin" && <span className="pill pill-admin">Admin</span>}
            </strong>
            <span className="muted small">{user.email}</span>
          </div>
        </div>
        <span className="small muted">Ime i prezime menja admin grupe.</span>
        <form action={signOut}>
          <button className="btn btn-outline btn-block" type="submit">Odjavi se</button>
        </form>
      </main>
      <BottomNav active="profil" isAdmin={member.role === "admin"} />
    </>
  );
}
