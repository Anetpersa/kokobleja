import type { RsvpRow } from "@/lib/events";
import { fullName, initials } from "@/lib/member";

const VISIBLE = 8; // koliko osoba se vidi pre „Prikaži još"

function PersonRow({ r, isMe }: { r: RsvpRow; isMe: boolean }) {
  const name = r.member ? fullName(r.member) : "Bivši član";
  return (
    <li className={`person-row${isMe ? " person-me" : ""}`}>
      <span className="avatar avatar-md">{r.member ? initials(r.member) : "?"}</span>
      <span className="person-name">{name}</span>
      {isMe && <span className="person-you">Ti</span>}
    </li>
  );
}

function PersonList({ rows, meId }: { rows: RsvpRow[]; meId: string }) {
  const first = rows.slice(0, VISIBLE);
  const rest = rows.slice(VISIBLE);
  return (
    <div>
      <ul className="person-list">
        {first.map((r) => (
          <PersonRow key={r.member_id} r={r} isMe={r.member_id === meId} />
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="person-more">
          <summary>
            <span className="more-closed">Prikaži još {rest.length}</span>
            <span className="more-open">Prikaži manje</span>
          </summary>
          <ul className="person-list">
            {rest.map((r) => (
              <PersonRow key={r.member_id} r={r} isMe={r.member_id === meId} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function Attendees({
  going,
  maybe,
  waitlist,
  meId,
  past,
}: {
  going: RsvpRow[];
  maybe: RsvpRow[];
  waitlist: RsvpRow[];
  meId: string;
  past: boolean;
}) {
  if (going.length + maybe.length + waitlist.length === 0) {
    return (
      <section className="card muted small" style={{ textAlign: "center" }}>
        Još niko nije prijavljen.
      </section>
    );
  }

  return (
    <section className="card stack" style={{ gap: 12 }}>
      <strong>{past ? "Bili su" : "Dolazi"} ({going.length})</strong>
      {going.length > 0 ? (
        <PersonList rows={going} meId={meId} />
      ) : (
        <span className="small muted">Niko još nije potvrdio.</span>
      )}

      {maybe.length > 0 && (
        <>
          <strong style={{ marginTop: 4 }}>Možda ({maybe.length})</strong>
          <PersonList rows={maybe} meId={meId} />
        </>
      )}

      {waitlist.length > 0 && !past && (
        <>
          <strong style={{ marginTop: 4 }}>Lista čekanja ({waitlist.length})</strong>
          <ol className="waitlist">
            {waitlist.map((r) => (
              <li key={r.member_id} className={r.member_id === meId ? "person-me-text" : undefined}>
                {r.member ? fullName(r.member) : "Bivši član"}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
