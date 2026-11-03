import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../prijava/actions";

export default async function PrivatnaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="page" style={{ textAlign: "center", alignItems: "center", paddingTop: 80 }}>
      <div
        style={{
          width: 120, height: 120, borderRadius: 60, background: "var(--tint)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <LogoMark size={64} />
      </div>
      <h1 className="display">Ovo je privatna grupa</h1>
      <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
        Eventi Kokobleje vidljivi su samo članovima. Ako treba da budeš ovde, javi se adminu grupe
        za pozivni link.
      </p>

      {user ? (
        <div className="stack" style={{ width: "100%" }}>
          <span className="small muted">Prijavljen/a si kao {user.email}</span>
          <form action={signOut}>
            <button className="btn btn-outline btn-block" type="submit">
              Prijavi se drugim emailom
            </button>
          </form>
        </div>
      ) : (
        <Link className="btn btn-block" href="/prijava">Već sam član – prijavi me</Link>
      )}
    </main>
  );
}
