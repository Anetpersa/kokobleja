import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "./actions";

export default async function PozivnicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ greska?: string }>;
}) {
  const { token } = await params;
  const { greska } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: isMember } = await supabase.rpc("is_active_member");
    if (isMember) redirect("/");
  }

  const here = `/pozivnica/${token}`;

  return (
    <main className="page">
      <Logo />
      <h1 className="display">Pozvan/a si u Kokobleju!</h1>
      <p className="muted" style={{ margin: 0 }}>
        Ovo je tvoj lični pozivni link. Važi samo jednom, pa ga ne prosleđuj.
      </p>

      {greska && <div className="notice notice-error">{greska}</div>}

      {user ? (
        <form action={acceptInvite} className="card stack">
          <input type="hidden" name="token" value={token} />
          <span>
            Prijavljen/a si kao <strong>{user.email}</strong>. Ovaj nalog će biti vezan za tebe u
            grupi.
          </span>
          <button className="btn btn-block" type="submit">Prihvati poziv</button>
        </form>
      ) : (
        <div className="card stack">
          <span>Prvo se prijavi emailom, pa se vrati ovde da prihvatiš poziv.</span>
          <Link className="btn btn-block" href={`/prijava?next=${encodeURIComponent(here)}`}>
            Prijavi se
          </Link>
        </div>
      )}
    </main>
  );
}
