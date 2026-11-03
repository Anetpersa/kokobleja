import type { RsvpRow } from "@/lib/events";
import { fullName, initials } from "@/lib/member";

function PersonChip({ r, highlight }: { r: RsvpRow; highlight: boolean }) {
  const name = r.member ? fullName(r.member) : "Bivši član";
  return (
    <span className={`person-chip${highlight ? " person-me" : ""}`}>
      <span className="avatar avatar-sm">{r.member ? initials(r.member) : "?"}</span>
      {name}
    </span>
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
        <div className="chips">
          {going.map((r) => (
            <PersonChip key={r.member_id} r={r} highlight={r.member_id === meId} />
          ))}
        </div>
      ) : (
        <span className="small muted">Niko još nije potvrdio.</span>
      )}

      {maybe.length > 0 && (
        <>
          <strong style={{ marginTop: 4 }}>Možda ({maybe.length})</strong>
          <div className="chips">
            {maybe.map((r) => (
              <PersonChip key={r.member_id} r={r} highlight={r.member_id === meId} />
            ))}
          </div>
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
