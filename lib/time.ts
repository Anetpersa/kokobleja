// Cela grupa je u Srbiji, pa sva vremena prikazujemo i unosimo po beogradskom vremenu,
// bez obzira na to gde radi server (Vercel radi u UTC-u).
export const TZ = "Europe/Belgrade";

function partsIn(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute"), s: get("second") };
}

// Koliko je Beograd ispred UTC-a u tom trenutku (60 ili 120 minuta)
function offsetMinutes(date: Date) {
  const p = partsIn(date);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  return Math.round((asUtc - date.getTime()) / 60000);
}

// "2026-11-05T19:00" (beogradsko vreme iz forme) → pravi trenutak (Date)
export function belgradeInputToDate(local: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return null;
  const [, y, m, d, h, mi] = match.map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let utc = guess - offsetMinutes(new Date(guess)) * 60000;
  utc = guess - offsetMinutes(new Date(utc)) * 60000; // ispravka oko promene na letnje vreme
  return new Date(utc);
}

// Date → "2026-11-05T19:00" za polje u formi
export function dateToBelgradeInput(iso: string): string {
  const p = partsIn(new Date(iso));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

function fmt(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("sr-Latn-RS", { timeZone: TZ, ...opts }).format(new Date(iso));
}

export const weekdayShort = (iso: string) => fmt(iso, { weekday: "short" }).replace(".", "").toUpperCase();
export const dayNumber = (iso: string) => fmt(iso, { day: "2-digit" }).replace(".", "");
export const monthShort = (iso: string) => fmt(iso, { month: "short" }).replace(".", "").toUpperCase();
export const timeOnly = (iso: string) => fmt(iso, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// "četvrtak, 5. novembar"
export function longDate(iso: string) {
  const s = fmt(iso, { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "čet, 5. nov u 19:00" za poruke u Viberu
export function shortDateTime(iso: string) {
  const d = fmt(iso, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, (m, i, s) => (i === s.length - 1 ? "" : m));
  return `${d} u ${timeOnly(iso)}`;
}
