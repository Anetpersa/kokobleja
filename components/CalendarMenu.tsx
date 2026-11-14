import { googleCalendarUrl } from "@/lib/calendar";
import type { EventRow } from "@/lib/events";

// "Dodaj u kalendar": Google Kalendar (Android) ili .ics fajl (iPhone i ostali)
export function CalendarMenu({ event }: { event: EventRow }) {
  return (
    <details className="menu">
      <summary className="link-summary">U kalendar</summary>
      <div className="menu-panel">
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
          Google Kalendar
          <span className="menu-hint">Android</span>
        </a>
        <a href={`/eventi/${event.id}/kalendar`}>
          Apple / ostali kalendari
          <span className="menu-hint">iPhone, Outlook, Samsung (.ics)</span>
        </a>
      </div>
    </details>
  );
}
