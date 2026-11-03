import type { EventRow } from "@/lib/events";
import { dateToBelgradeInput } from "@/lib/time";

export function EventForm({
  action,
  event,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  event?: EventRow;
  submitLabel: string;
}) {
  return (
    <form action={action} className="stack" style={{ gap: 14 }}>
      {event && <input type="hidden" name="id" value={event.id} />}

      <label className="field">
        Naziv
        <input type="text" name="title" defaultValue={event?.title} placeholder="npr. Board game veče" required />
      </label>

      <label className="field">
        Datum i vreme
        <input
          type="datetime-local"
          name="starts_at"
          defaultValue={event ? dateToBelgradeInput(event.starts_at) : undefined}
          required
        />
      </label>

      <label className="field">
        Mesto
        <input type="text" name="location" defaultValue={event?.location} placeholder="Naziv mesta i adresa" required />
        <span className="small muted" style={{ fontWeight: 400 }}>Link ka mapi se pravi automatski iz ovoga.</span>
      </label>

      <label className="field">
        <span>
          Kratak opis <span className="muted" style={{ fontWeight: 600 }}>(opciono)</span>
        </span>
        <textarea name="description" rows={3} defaultValue={event?.description ?? ""} />
      </label>

      <div className="card stack">
        <label className="field">
          <span>
            Maksimalan broj mesta <span className="muted" style={{ fontWeight: 600 }}>(opciono)</span>
          </span>
          <input
            type="number"
            name="max_spots"
            min={1}
            inputMode="numeric"
            defaultValue={event?.max_spots ?? ""}
            placeholder="Bez ograničenja"
            style={{ maxWidth: 200 }}
          />
        </label>
        <span className="small muted">
          Kad se popuni, sledeći idu na listu čekanja i automatski upadaju ako se neko odjavi.
        </span>
      </div>

      <button className="btn btn-block" type="submit">{submitLabel}</button>
    </form>
  );
}
