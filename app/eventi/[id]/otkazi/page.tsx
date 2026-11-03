import { BackButton } from "@/components/BackButton";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CANCEL_REASONS, canManage, EVENT_SELECT, type EventRow } from "@/lib/events";
import { requireMember } from "@/lib/member";
import { shortDateTime } from "@/lib/time";
import { cancelEvent } from "../../actions";

export default async function OtkaziEventPage({
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
  if (!canManage(event, member) || event.status === "cancelled") redirect(`/eventi/${id}`);

  return (
    <main className="page">
      <BackButton href={`/eventi/${id}`} label="Nazad na event" />
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="display">Otkaži event?</h1>
        <span className="muted">
          {event.title} · {shortDateTime(event.starts_at)}
        </span>
      </div>

      {greska && <div className="notice notice-error">{greska}</div>}

      <form action={cancelEvent} className="stack" style={{ gap: 16 }}>
        <input type="hidden" name="id" value={event.id} />

        <fieldset className="stack" style={{ border: "none", padding: 0, margin: 0, gap: 10 }}>
          <legend style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>
            Razlog <span className="muted" style={{ fontWeight: 600 }}>(opciono)</span>
          </legend>
          <div className="chips">
            {CANCEL_REASONS.map((r) => (
              <label key={r} className="chip">
                <input type="radio" name="reason" value={r} />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          Dodatna poruka za ekipu
          <input type="text" name="note" placeholder="npr. Probaćemo sledeće nedelje!" />
        </label>

        <div className="notice">
          Event ostaje u listi kao otkazan i može da se vrati. Posle otkazivanja dobijaš dugme da javiš
          ekipi u Viber.
        </div>

        <button className="btn btn-block btn-solid-danger" type="submit">Otkaži event</button>
        <Link href={`/eventi/${id}`} className="btn btn-ghost btn-block">Ne, vrati se</Link>
      </form>
    </main>
  );
}
