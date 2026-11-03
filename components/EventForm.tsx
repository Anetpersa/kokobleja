import { LocationField } from "@/components/LocationField";
import { CATEGORIES, type EventRow } from "@/lib/events";
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

      <fieldset className="stack" style={{ border: "none", padding: 0, margin: 0, gap: 8 }}>
        <legend style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>
          Vrsta <span className="muted" style={{ fontWeight: 600 }}>(opciono)</span>
        </legend>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <label key={c.key} className="chip">
              <input type="radio" name="category" value={c.key} defaultChecked={event?.category === c.key} />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        Datum i vreme
        <input
          type="datetime-local"
          name="starts_at"
          defaultValue={event ? dateToBelgradeInput(event.starts_at) : undefined}
          required
        />
      </label>

      <LocationField defaultValue={event ? event.location : undefined} />

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
