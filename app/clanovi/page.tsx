import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { InviteLinkButton } from "@/components/InviteLinkButton";
import { fullName, initials, requireAdmin, type Member } from "@/lib/member";
import { addMember, reactivateMember } from "./actions";

const order = { pending: 0, active: 1, deactivated: 2 } as const;

export default async function ClanoviPage({
  searchParams,
}: {
  searchParams: Promise<{ novi?: string; greska?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { novi, greska } = await searchParams;

  const { data: members } = await supabase.from("members").select("*").returns<Member[]>();
  const { data: invites } = await supabase
    .from("invites")
    .select("member_id, token, created_at")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  const tokenFor = new Map<string, string>();
  for (const i of invites ?? []) if (!tokenFor.has(i.member_id)) tokenFor.set(i.member_id, i.token);

  const sorted = [...(members ?? [])].sort(
    (a, b) =>
      order[a.status] - order[b.status] || fullName(a).localeCompare(fullName(b), "sr"),
  );
  const active = sorted.filter((m) => m.status === "active").length;
  const pending = sorted.filter((m) => m.status === "pending").length;
  const highlighted = sorted.find((m) => m.id === novi);

  return (
    <>
    <main className="page" style={{ paddingBottom: 120 }}>
      <div className="stack" style={{ gap: 2 }}>
        <span className="eyebrow">Admin</span>
        <h1 className="display">Članovi</h1>
        <span className="muted">
          {active} aktivnih · {pending} čeka prijavu
        </span>
      </div>

      {greska && <div className="notice notice-error">{greska}</div>}

      {highlighted && highlighted.status === "pending" && tokenFor.get(highlighted.id) && (
        <div className="notice spread">
          <span>
            Pošalji <strong>{highlighted.first_name}</strong> lični pozivni link u Viberu.
          </span>
          <InviteLinkButton token={tokenFor.get(highlighted.id)!} name={highlighted.first_name} />
        </div>
      )}

      <form action={addMember} className="card stack">
        <strong>Dodaj člana</strong>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <label className="field" style={{ flex: 1 }}>
            Ime
            <input type="text" name="first_name" required />
          </label>
          <label className="field" style={{ flex: 1 }}>
            Prezime
            <input type="text" name="last_name" />
          </label>
        </div>
        <button className="btn" type="submit">Dodaj i napravi pozivni link</button>
      </form>

      <ul className="card list" style={{ margin: 0 }}>
        {sorted.map((m) => (
          <li key={m.id} className="row">
            <span
              className="avatar"
              style={m.status === "deactivated" ? { background: "#efe6df", color: "var(--muted)" } : undefined}
            >
              {initials(m)}
            </span>
            <div className="stack" style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <span style={{ fontWeight: 800, color: m.status === "deactivated" ? "var(--muted)" : undefined }}>
                {fullName(m)}{" "}
                {m.role === "admin" && <span className="pill pill-admin">Admin</span>}
              </span>
              {m.status === "pending" && <span className="pill pill-pending" style={{ alignSelf: "flex-start" }}>Čeka prijavu</span>}
              {m.status === "deactivated" && <span className="pill pill-off" style={{ alignSelf: "flex-start" }}>Deaktiviran</span>}
            </div>

            {m.status === "pending" && tokenFor.get(m.id) && (
              <InviteLinkButton token={tokenFor.get(m.id)!} name={m.first_name} />
            )}
            {m.status === "deactivated" ? (
              <form action={reactivateMember}>
                <input type="hidden" name="id" value={m.id} />
                <button className="btn btn-ghost btn-sm" type="submit">Vrati</button>
              </form>
            ) : (
              <Link className="btn btn-ghost btn-sm" href={`/clanovi/${m.id}`} aria-label={`Uredi člana ${fullName(m)}`}>
                Uredi
              </Link>
            )}
          </li>
        ))}
      </ul>
    </main>
    <BottomNav active="clanovi" isAdmin />
    </>
  );
}
