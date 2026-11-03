import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireMember } from "@/lib/member";
import { signOut } from "./prijava/actions";

export default async function Home() {
  const { member } = await requireMember();

  return (
    <main className="page">
      <div className="spread">
        <Logo />
        <form action={signOut}>
          <button className="btn btn-ghost btn-sm" type="submit">Odjavi se</button>
        </form>
      </div>

      <h1 className="display">Ćao, {member.first_name}!</h1>

      <div className="card stack">
        <strong>Eventi stižu u sledećem koraku</strong>
        <span className="muted">Prijava i članovi rade. Ovde će uskoro biti lista eventova.</span>
      </div>

      {member.role === "admin" && (
        <Link href="/clanovi" className="btn btn-outline">Upravljaj članovima</Link>
      )}
    </main>
  );
}
