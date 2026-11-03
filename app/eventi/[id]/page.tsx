import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ShareButton } from "@/components/ShareButton";
import { canManage, categoryLabel, EVENT_SELECT, LOCATION_TBD, mapsUrl, type EventRow } from "@/lib/events";
import { fullName, requireMember } from "@/lib/member";
import { longDate, shortDateTime, timeOnly } from "@/lib/time";
import { deleteEvent, restoreEvent } from "../actions";

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string; otkazano?: string; greska?: string }>;
}) {
  const { id } = await params;
  const { novo, otkazano, greska } = await searchParams;
  const { supabase, member } = await requireMember();

  const { data: event } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", id)
    .maybeSingle<EventRow>();
  if (!event) notFound();

  const cancelled = event.status === "cancelled";
  const manage = canManage(event, member);
  const path = `/eventi/${event.id}`;
  const category = categoryLabel(event.category);
  const inviteText = `${event.title}, ${shortDateTime(event.starts_at)}${event.location ? `, ${event.location}` : ""}. Prijavi se:`;
  const cancelText = `OTKAZANO: ${event.title} (${shortDateTime(event.starts_at)})${event.cancel_reason ? `. Razlog: ${event.cancel_reason}` : ""}`;

  return (
    <main className="page">
      <div className="spread">
        <Link href="/" className="icon-btn" aria-label="Nazad na evente">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <div className="row" style={{ gap: 8 }}>
          {!cancelled && <ShareButton text={inviteText} path={path} />}
          {manage && (
            <details className="menu">
              <summary className="btn btn-ghost btn-sm" aria-label="Opcije eventa">Opcije ▾</summary>
              <div className="menu-panel">
                {!cancelled && <Link href={`${path}/izmeni`}>Izmeni event</Link>}
                {!cancelled && <Link href={`${path}/otkazi`} className="danger-text">Otkaži event</Link>}
                <form action={deleteEvent}>
                  <input type="hidden" name="id" value={event.id} />
                  <ConfirmButton message="Trajno obrisati ovaj event? Ovo je samo za greške (npr. duplikat). Za neodržane evente koristi Otkaži." className="menu-button">
                    Obriši event
                  </ConfirmButton>
                </form>
              </div>
            </details>
          )}
        </div>
      </div>

      {greska && <div className="notice notice-error">{greska}</div>}

      {novo && (
        <div className="notice stack">
          <strong>Event je objavljen!</strong>
          <span>Pošalji link u Viber grupu da se ekipa prijavi.</span>
          <ShareButton text={inviteText} path={path} label="Podeli u Viber" className="btn btn-block" />
        </div>
      )}

      <section className={`hero${cancelled ? " hero-cancelled" : ""}`}>
        {(cancelled || category) && (
          <div className="row" style={{ gap: 8 }}>
            {cancelled && <span className="pill pill-cancelled-solid">OTKAZANO</span>}
            {category && <span className={`hero-badge cat-${event.category}`}>{category}</span>}
          </div>
        )}
        <h1 className="display" style={cancelled ? { textDecoration: "line-through" } : undefined}>{event.title}</h1>
        <span className="hero-sub">Organizuje {event.organizer ? fullName(event.organizer) : "—"}</span>
      </section>

      {cancelled && (
        <div className="notice notice-error stack" style={{ gap: 4 }}>
          <strong>{event.cancel_reason ? `Razlog: ${event.cancel_reason}` : "Event je otkazan"}</strong>
          <span className="small">Prijave i komentari su zaključani.</span>
        </div>
      )}

      {cancelled && manage && (
        <div className="card stack" style={{ background: "var(--tint)", border: "none" }}>
          <div className="spread">
            <strong>Javi ekipi</strong>
            <span className="eyebrow" style={{ fontSize: 11 }}>Samo organizator</span>
          </div>
          {otkazano && <span className="small muted">Push obaveštenja stižu u kasnijem koraku, zato javi u Viber.</span>}
          <ShareButton text={cancelText} path={path} label="Podeli otkazivanje u Viber" className="btn btn-viber btn-block" />
          <form action={restoreEvent}>
            <input type="hidden" name="id" value={event.id} />
            <button className="btn btn-outline btn-block" type="submit">Vrati event</button>
          </form>
        </div>
      )}

      <section className="card" style={{ padding: "4px 16px" }}>
        <div className="info-row">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          <div className="stack" style={{ gap: 0 }}>
            <strong>{longDate(event.starts_at)}</strong>
            <span className="muted">{timeOnly(event.starts_at)}</span>
          </div>
        </div>
        <div className="info-row">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>
          {event.location ? (
            <>
              <strong style={{ flex: 1 }}>{event.location}</strong>
              <a href={mapsUrl(event.location)} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 800 }}>Mapa</a>
            </>
          ) : (
            <div className="stack" style={{ gap: 0 }}>
              <strong>{LOCATION_TBD}</strong>
              <span className="muted small">Organizator će javiti kad bude određeno.</span>
            </div>
          )}
        </div>
        {event.max_spots && (
          <div className="info-row">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <strong>Do {event.max_spots} mesta</strong>
          </div>
        )}
      </section>

      {event.description && <p style={{ margin: "0 4px", lineHeight: 1.5, whiteSpace: "pre-line" }}>{event.description}</p>}

      {!cancelled && (
        <div className="card muted small" style={{ textAlign: "center" }}>
          Prijave (Dolazim / Možda) stižu u sledećem koraku.
        </div>
      )}
    </main>
  );
}
