import { BackButton } from "@/components/BackButton";
import { notFound } from "next/navigation";
import { initials, requireAdmin, type Member } from "@/lib/member";
import { deactivateMember, newInvite, unlinkMember, updateMember } from "../actions";

export default async function UrediClanaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ greska?: string }>;
}) {
  const { id } = await params;
  const { greska } = await searchParams;
  const { supabase, member: me } = await requireAdmin();

  const { data: m } = await supabase.from("members").select("*").eq("id", id).maybeSingle<Member>();
  if (!m) notFound();
  const isMe = m.id === me.id;

  return (
    <main className="page">
      <BackButton href="/clanovi" label="Nazad na članove" />
      <h1 className="display">Uredi člana</h1>

      <div className="stack" style={{ alignItems: "center" }}>
        <span className="avatar" style={{ width: 76, height: 76, borderRadius: 38, fontSize: 28 }}>
          {initials(m)}
        </span>
        <span className="small muted">
          Član od {new Date(m.created_at).toLocaleDateString("sr-Latn", { month: "long", year: "numeric" })}
        </span>
      </div>

      {greska && <div className="notice notice-error">{greska}</div>}

      <form action={updateMember} className="stack" style={{ gap: 14 }}>
        <input type="hidden" name="id" value={m.id} />
        <div className="row">
          <label className="field" style={{ flex: 1 }}>
            Ime
            <input type="text" name="first_name" defaultValue={m.first_name} required />
          </label>
          <label className="field" style={{ flex: 1 }}>
            Prezime
            <input type="text" name="last_name" defaultValue={m.last_name ?? ""} />
          </label>
        </div>
        <label className="field">
          Uloga
          <select name="role" defaultValue={m.role} disabled={isMe}>
            <option value="member">Član</option>
            <option value="admin">Admin</option>
          </select>
          {isMe && <input type="hidden" name="role" value="admin" />}
        </label>
        <button className="btn btn-block" type="submit">Sačuvaj izmene</button>
      </form>

      <div className="card stack">
        <strong>Nalog za prijavu</strong>
        {m.auth_user_id ? (
          <>
            <span className="small muted">
              Nalog je povezan. Ako član promeni email, odveži nalog i pošalji mu novi pozivni
              link. Prijave, komentari i eventi ostaju sačuvani.
            </span>
            {!isMe && (
              <form action={unlinkMember}>
                <input type="hidden" name="id" value={m.id} />
                <button className="btn btn-outline btn-block" type="submit">
                  Odveži nalog i napravi novi pozivni link
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <span className="small muted">Član još nije prihvatio poziv.</span>
            <form action={newInvite}>
              <input type="hidden" name="id" value={m.id} />
              <button className="btn btn-outline btn-block" type="submit">Napravi novi pozivni link</button>
            </form>
          </>
        )}
      </div>

      {!isMe && (
        <form action={deactivateMember}>
          <input type="hidden" name="id" value={m.id} />
          <button className="btn btn-danger btn-block" type="submit">Deaktiviraj člana</button>
        </form>
      )}
    </main>
  );
}
