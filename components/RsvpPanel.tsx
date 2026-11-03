import type { RsvpStatus } from "@/lib/events";
import { cancelRsvp, setRsvp } from "@/app/eventi/actions";

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// Dugmad Dolazim / Možda + odjava, za event koji je aktivan i nije prošao
export function RsvpPanel({
  eventId,
  myStatus,
  waitPosition,
  full,
}: {
  eventId: string;
  myStatus: RsvpStatus | null;
  waitPosition: number | null;
  full: boolean;
}) {
  const goingLabel = myStatus === "going" ? "Dolazim" : full ? "Lista čekanja" : "Dolazim";

  return (
    <section className="stack" style={{ gap: 10 }}>
      {myStatus === "waitlist" && waitPosition && (
        <div className="notice">
          <strong>Na listi čekanja si ({waitPosition}. u redu).</strong> Čim se neko odjavi, automatski
          upadaš.
        </div>
      )}
      {full && !myStatus && (
        <div className="notice">Sva mesta su popunjena. Možeš da se upišeš na listu čekanja.</div>
      )}

      <div className="rsvp-grid">
        <form action={setRsvp}>
          <input type="hidden" name="id" value={eventId} />
          <input type="hidden" name="status" value="going" />
          <button
            type="submit"
            className={`rsvp-btn${myStatus === "going" || myStatus === "waitlist" ? " rsvp-on" : ""}`}
            aria-pressed={myStatus === "going" || myStatus === "waitlist"}
          >
            {(myStatus === "going" || myStatus === "waitlist") && <CheckIcon />}
            {myStatus === "waitlist" ? "Čekam mesto" : goingLabel}
          </button>
        </form>
        <form action={setRsvp}>
          <input type="hidden" name="id" value={eventId} />
          <input type="hidden" name="status" value="maybe" />
          <button
            type="submit"
            className={`rsvp-btn rsvp-maybe${myStatus === "maybe" ? " rsvp-on-maybe" : ""}`}
            aria-pressed={myStatus === "maybe"}
          >
            {myStatus === "maybe" && <CheckIcon />}
            Možda
          </button>
        </form>
      </div>

      {myStatus && (
        <form action={cancelRsvp}>
          <input type="hidden" name="id" value={eventId} />
          <button type="submit" className="link-btn">
            {myStatus === "waitlist" ? "Izađi sa liste čekanja" : "Ipak ne mogu – odjavi me"}
          </button>
        </form>
      )}
    </section>
  );
}
