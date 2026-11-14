import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { ShareButton } from "@/components/ShareButton";
import { canManage, EVENT_SELECT, type EventRow } from "@/lib/events";
import { requireMember } from "@/lib/member";
import { shortDateTime, timeOnly } from "@/lib/time";
import { remindEvent } from "../../actions";

const WAIT_MS = 3 * 60 * 60 * 1000;

type Audience = { signed_total: number; signed_push: number; unsigned_total: number; unsigned_push: number };
type Reminder = { audience: "signed" | "unsigned"; sent_at: string };

function people(n: number) {
  return n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? `${n} osobe` : `${n} osoba`;
}

export default async function PodsetiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ greska?: string }>;
}) {
  const { id } = await params;
  const { greska } = await searchParams;
  const { supabase, member } = await requireMember();

  const { data: event } = await supabase.from("events").select(EVENT_SELECT).eq("id", id).maybeSingle<EventRow>();
  if (!event) notFound();
  if (!canManage(event, member) || event.status === "cancelled" || new Date(event.starts_at).getTime() <= Date.now()) {
    redirect(`/eventi/${id}`);
  }

  const [{ data: audienceData }, { data: reminderData }] = await Promise.all([
    supabase.rpc("reminder_audience", { p_event_id: id }).single<Audience>(),
    supabase
      .from("event_reminders")
      .select("audience, sent_at")
      .eq("event_id", id)
      .order("sent_at", { ascending: false })
      .returns<Reminder[]>(),
  ]);
  const a = audienceData ?? { signed_total: 0, signed_push: 0, unsigned_total: 0, unsigned_push: 0 };
  const last = (aud: Reminder["audience"]) => (reminderData ?? []).find((r) => r.audience === aud)?.sent_at ?? null;
  const now = Date.now();

  const options = [
    {
      key: "signed" as const,
      title: "Prijavljenima",
      what: "Podseti one koji su kliknuli Dolazim ili Možda na sam event i detalje.",
      total: a.signed_total,
      push: a.signed_push,
      lastSent: last("signed"),
    },
    {
      key: "unsigned" as const,
      title: "Onima koji se još nisu prijavili",
      what: "Javi ostatku ekipe da se event održava, pa neka se prijave ako žele.",
      total: a.unsigned_total,
      push: a.unsigned_push,
      lastSent: last("unsigned"),
    },
  ].map((o) => ({ ...o, blocked: o.lastSent !== null && now - new Date(o.lastSent).getTime() < WAIT_MS }));
  const firstOpen = options.find((o) => !o.blocked && o.total > 0)?.key;
  const viberText = `Podsetnik: ${event.title}, ${shortDateTime(event.starts_at)}${event.location ? `, ${event.location}` : ""}. Prijavi se:`;

  return (
    <main className="page">
      <BackButton href={`/eventi/${id}`} label="Nazad na event" />
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="display">Podseti ekipu</h1>
        <span className="muted">
          {event.title} · {shortDateTime(event.starts_at)}
        </span>
      </div>

      {greska && <div className="notice notice-error">{greska}</div>}

      <form action={remindEvent} className="stack" style={{ gap: 16 }}>
        <input type="hidden" name="id" value={event.id} />

        <fieldset className="audience" style={{ border: "none", padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Kome šalješ?</legend>
          {options.map((o) => (
            <label key={o.key} className="audience-option">
              <input
                type="radio"
                name="audience"
                value={o.key}
                defaultChecked={o.key === firstOpen}
                disabled={o.blocked || o.total === 0}
                required
              />
              <span className="stack" style={{ gap: 4 }}>
                <strong>{o.title}</strong>
                <span className="small" style={{ lineHeight: 1.4 }}>{o.what}</span>
                <span className="small muted">
                  {o.total === 0
                    ? "Trenutno nema nikoga u ovoj grupi."
                    : `${people(o.total)}, od toga ${o.push} sa uključenim obaveštenjima`}
                </span>
                {o.blocked && o.lastSent && (
                  <span className="small" style={{ fontWeight: 700 }}>
                    Poslato u {timeOnly(o.lastSent)}. Sledeći posle {timeOnly(new Date(new Date(o.lastSent).getTime() + WAIT_MS).toISOString())}.
                  </span>
                )}
              </span>
            </label>
          ))}
        </fieldset>

        <label className="field">
          Poruka <span className="muted" style={{ fontWeight: 600 }}>(opciono)</span>
          <textarea name="message" rows={2} maxLength={200} placeholder="npr. Ponesite kocke! Počinjemo tačno u 19h." />
        </label>

        <div className="notice small" style={{ lineHeight: 1.45 }}>
          Obaveštenje stiže samo onima koji su uključili obaveštenja. Isti podsetnik može ponovo tek posle 3 sata.
        </div>

        <button className="btn btn-block" type="submit" disabled={!firstOpen}>
          Pošalji podsetnik
        </button>
      </form>

      <div className="card stack">
        <strong>Ostalima javi u Viber</strong>
        <span className="small muted">Za one koji nemaju uključena obaveštenja.</span>
        <ShareButton text={viberText} path={`/eventi/${id}`} label="Podeli podsetnik u Viber" className="btn btn-viber btn-block" />
      </div>

      <Link href={`/eventi/${id}`} className="btn btn-ghost btn-block">Nazad na event</Link>
    </main>
  );
}
