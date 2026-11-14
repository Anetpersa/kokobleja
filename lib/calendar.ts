import type { EventRow } from "@/lib/events";
import { eventUrl } from "@/lib/site";

// Nemamo polje za kraj eventa, pa u kalendar upisujemo 3 sata trajanja
export const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

type CalEvent = Pick<EventRow, "id" | "title" | "description" | "starts_at" | "location" | "updated_at">;

// 2026-11-15T18:00:00.000Z → 20261115T180000Z
function utcStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function details(e: CalEvent) {
  const link = `Detalji i prijava: ${eventUrl(e.id)}`;
  return e.description ? `${e.description}\n\n${link}` : link;
}

// ---------- .ics fajl (iPhone, Outlook, Samsung kalendar...) ----------
function escapeText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Linije u .ics fajlu smeju da imaju najviše 75 bajtova; duže se lome, a nastavak počinje razmakom
function fold(line: string) {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch, "utf8");
    if (bytes + size > (out.length === 0 ? 75 : 74)) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcs(e: CalEvent, cancelled: boolean) {
  const start = new Date(e.starts_at);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kokobleja//Eventi//SR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@kokobleja`,
    `DTSTAMP:${utcStamp(new Date())}`,
    // Ako se event izmeni, ponovni uvoz zamenjuje stari unos umesto da pravi duplikat
    `SEQUENCE:${Math.floor(new Date(e.updated_at).getTime() / 1000) % 2_000_000_000}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeText(e.title)}`,
    ...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []),
    `DESCRIPTION:${escapeText(details(e))}`,
    `URL:${eventUrl(e.id)}`,
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

// ---------- Google Kalendar (Android) ----------
export function googleCalendarUrl(e: CalEvent) {
  const start = new Date(e.starts_at);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${utcStamp(start)}/${utcStamp(end)}`,
    details: details(e),
    ctz: "Europe/Belgrade",
  });
  if (e.location) params.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
