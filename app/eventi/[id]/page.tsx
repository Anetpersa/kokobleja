import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarMenu } from "@/components/CalendarMenu";
import { Comments } from "@/components/Comments";
import { Logo } from "@/components/Logo";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ShareButton } from "@/components/ShareButton";
import { Attendees } from "@/components/Attendees";
import { RsvpPanel } from "@/components/RsvpPanel";
import {
  canManage,
  categoryLabel,
  COMMENT_SELECT,
  EVENT_SELECT,
  isPast,
  LOCATION_TBD,
  mapsUrl,
  RSVP_SELECT,
  splitRsvps,
  type CommentRow,
  type EventRow,
  type RsvpRow,
} from "@/lib/events";
import { fullName, getViewer } from "@/lib/member";
import { getEventPreview } from "@/lib/preview";
import { eventUrl } from "@/lib/site";
import { longDate, shortDateTime, timeOnly } from "@/lib/time";
import { deleteEvent, restoreEvent } from "../actions";

// Naslov i opis za preview linka u Viberu (slika je u opengraph-image.tsx)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const preview = await getEventPreview(id);
  if (!preview) return { title: "Kokobleja" };

  const title = preview.cancelled ? `OTKAZANO: ${preview.title}` : preview.title;
  const description = `${longDate(preview.starts_at)} u ${timeOnly(preview.starts_at)}`;
  return {
    title: `${title} · Kokobleja`,
    description,
    openGraph: {
      title,
      description,
      url: eventUrl(id),
      siteName: "Kokobleja",
      locale: "sr_RS",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// 1 osoba, 2 osobe, 5 osoba
function osobe(n: number) {
  return n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "osobe" : "osoba";
}

// Neprijavljeni vide samo naziv i datum (isto što i preview u Viberu) i dugme za prijavu
async function EventGate({ id }: { id: string }) {
  const preview = await getEventPreview(id);
  if (!preview) notFound();
  const path = `/eventi/${id}`;

  return (
    <main className="page">
      <Logo />
      <div className="card stack" style={{ gap: 6 }}>
        <span className="eyebrow">{preview.cancelled ? "Otkazan event" : "Poziv na event"}</span>
        <h1 className="display" style={preview.cancelled ? { textDecoration: "line-through" } : undefined}>
          {preview.title}
        </h1>
        <strong>{longDate(preview.starts_at)} u {timeOnly(preview.starts_at)}</strong>
      </div>
      <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
        Kokobleja je privatna grupa. Prijavi se da vidiš detalje i javiš da li dolaziš.
      </p>
      <Link className="btn btn-block" href={`/prijava?next=${encodeURIComponent(path)}`}>
        Prijavi se
      </Link>
    </main>
  );
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string; otkazano?: string; cekanje?: string; podsetnik?: string; greska?: string }>;
}) {
  const { id } = await params;
  const { novo, otkazano, cekanje, podsetnik, greska } = await searchParams;
  const viewer = await getViewer();
  if (!viewer.user) return <EventGate id={id} />;
  if (!viewer.member) redirect("/privatna");
  const { supabase, member } = viewer;

  const { data: event } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", id)
    .maybeSingle<EventRow>();
  if (!event) notFound();

  const [{ data: rsvpData }, { data: commentData }] = await Promise.all([
    supabase.from("rsvps").select(RSVP_SELECT).eq("event_id", id).returns<RsvpRow[]>(),
    supabase.from("comments").select(COMMENT_SELECT).eq("event_id", id).order("created_at").returns<CommentRow[]>(),
  ]);
  const rsvps = rsvpData ?? [];
  const { going, maybe, waitlist } = splitRsvps(rsvps);
  const mine = rsvps.find((r) => r.member_id === member.id) ?? null;
  const waitPosition = mine?.status === "waitlist" ? waitlist.findIndex((r) => r.member_id === member.id) + 1 : null;
  const full = event.max_spots !== null && going.length >= event.max_spots;
  const past = isPast(event.starts_at);
  const started = new Date(event.starts_at).getTime() <= Date.now();
  const othersSignedUp = rsvps.some((r) => r.member_id !== event.organizer_id);
  const canDelete = member.role === "admin" || !othersSignedUp;

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
                {!cancelled && !started && <Link href={`${path}/podseti`}>Podseti ekipu</Link>}
                {!cancelled && <Link href={`${path}/izmeni`}>Izmeni event</Link>}
                {!cancelled && <Link href={`${path}/otkazi`} className="danger-text">Otkaži event</Link>}
                {canDelete ? (
                  <form action={deleteEvent}>
                    <input type="hidden" name="id" value={event.id} />
                    <ConfirmButton message="Trajno obrisati ovaj event? Ovo je samo za greške (npr. duplikat). Za neodržane evente koristi Otkaži." className="menu-button">
                      Obriši event
                    </ConfirmButton>
                  </form>
                ) : (
                  <span className="menu-note">Brisanje nije moguće jer ima prijava. Otkaži event umesto toga.</span>
                )}
              </div>
            </details>
          )}
        </div>
      </div>

      {greska && <div className="notice notice-error">{greska}</div>}

      {podsetnik !== undefined && (
        <div className="notice">
          {Number(podsetnik) > 0
            ? `Podsetnik je poslat (obaveštenje dobija ${Number(podsetnik)} ${osobe(Number(podsetnik))}).`
            : "Podsetnik je zabeležen, ali niko od njih još nema uključena obaveštenja. Javi im u Viber."}
        </div>
      )}

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
          {otkazano && (
            <span className="small muted">
              Prijavljeni sa uključenim obaveštenjima su dobili obaveštenje. Za ostale podeli otkazivanje u Viber.
            </span>
          )}
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
          <div className="stack" style={{ gap: 0, flex: 1 }}>
            <strong>{longDate(event.starts_at)}</strong>
            <span className="muted">{timeOnly(event.starts_at)}</span>
          </div>
          {!cancelled && !past && <CalendarMenu event={event} />}
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
        <div className="info-row">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          {event.max_spots ? (
            <div className="stack" style={{ flex: 1, gap: 6 }}>
              <strong>
                {Math.min(going.length, event.max_spots)} / {event.max_spots} mesta popunjeno
                {waitlist.length > 0 && <span className="muted" style={{ fontWeight: 600 }}> · {waitlist.length} čeka</span>}
              </strong>
              <div className="bar" aria-hidden="true">
                <div className="bar-fill" style={{ width: `${Math.min(100, (going.length / event.max_spots) * 100)}%` }} />
              </div>
            </div>
          ) : (
            <strong>
              {going.length} dolazi{maybe.length > 0 && <span className="muted" style={{ fontWeight: 600 }}> · {maybe.length} možda</span>}
            </strong>
          )}
        </div>
      </section>

      {event.description && <p style={{ margin: "0 4px", lineHeight: 1.5, whiteSpace: "pre-line" }}>{event.description}</p>}

      {cekanje && mine?.status === "waitlist" && !cancelled && (
        <div className="notice">Mesta su popunjena, pa si upisan/a na listu čekanja.</div>
      )}

      {!cancelled && !past && (
        <RsvpPanel eventId={event.id} myStatus={mine?.status ?? null} waitPosition={waitPosition} full={full} />
      )}

      <Attendees going={going} maybe={maybe} waitlist={waitlist} meId={member.id} past={past} />

      <Comments eventId={event.id} comments={commentData ?? []} me={member} locked={cancelled} signedUp={mine !== null} past={past} />
    </main>
  );
}
