// Slanje push obaveštenja (radi SAMO na serveru: koristi tajne ključeve).
// Baza (trigeri u supabase/008_obavestenja.sql) upisuje poruke u push_outbox,
// a sendPendingPushes() ih preuzme i pošalje na telefone i računare.
import * as webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { LOCATION_TBD } from "@/lib/events";
import { shortDateTime } from "@/lib/time";

type OutboxRow = {
  id: number;
  member_id: string;
  event_id: string | null;
  kind: "new_event" | "cancelled" | "restored" | "changed" | "promoted" | "comment" | "reminder";
  data: Record<string, unknown>;
  created_at: string;
};

type Sub = { endpoint: string; member_id: string; p256dh: string; auth: string };

type PushEvent = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  status: "active" | "cancelled";
  cancel_reason: string | null;
  organizer: { first_name: string } | null;
};

export type PushMessage = { title: string; body: string; url: string; tag?: string };

// Poruke starije od ovoga se ne šalju (npr. ako je slanje zapelo, ne želimo staro obaveštenje sutra)
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const BATCH = 300;

let configured = false;
function setup() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!publicKey || !privateKey || !secret) return null; // obaveštenja još nisu podešena na Vercelu
  if (!configured) {
    webpush.setVapidDetails("mailto:kokobleja@gmail.com", publicKey, privateKey);
    configured = true;
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function text(v: unknown) {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function buildMessage(row: OutboxRow, e: PushEvent): PushMessage | null {
  const when = shortDateTime(e.starts_at);
  const place = e.location ?? LOCATION_TBD;
  const url = `/eventi/${e.id}`;
  const d = row.data ?? {};

  switch (row.kind) {
    case "new_event":
      if (e.status !== "active") return null;
      return {
        title: `Novi event: ${e.title}`,
        body: `${when} · ${place}${e.organizer ? `\nOrganizuje ${e.organizer.first_name}` : ""}`,
        url,
        tag: `event-${e.id}`,
      };
    case "cancelled":
      if (e.status !== "cancelled") return null;
      return {
        title: `Otkazano: ${e.title}`,
        body: `${when}${e.cancel_reason ? `\nRazlog: ${e.cancel_reason}` : ""}`,
        url,
        tag: `event-${e.id}`,
      };
    case "restored":
      if (e.status !== "active") return null;
      return { title: `Ipak se održava: ${e.title}`, body: `${when} · ${place}`, url, tag: `event-${e.id}` };
    case "changed": {
      if (e.status !== "active") return null;
      const lines = [];
      if (d.time) lines.push(`Novo vreme: ${when}`);
      if (d.place) lines.push(`Novo mesto: ${place}`);
      return { title: `Izmena: ${e.title}`, body: lines.join("\n") || `${when} · ${place}`, url, tag: `event-${e.id}` };
    }
    case "promoted":
      if (e.status !== "active") return null;
      return {
        title: "Oslobodilo se mesto – dolaziš! 🎉",
        body: `${e.title}, ${when}. Ako ipak ne možeš, odjavi se da mesto dobije sledeći.`,
        url,
        tag: `promoted-${e.id}`,
      };
    case "comment":
      return {
        title: `${text(d.author) ?? "Neko"} · ${e.title}`,
        body: text(d.body) ?? "Novi komentar",
        url: `${url}#komentari`,
        tag: `comment-${e.id}`,
      };
    case "reminder": {
      if (e.status !== "active") return null;
      const message = text(d.message);
      const from = text(d.from);
      const note = message ? `\n${from ? `${from}: ` : ""}${message}` : "";
      if (d.audience === "unsigned") {
        return {
          title: `${e.title} se održava!`,
          body: `${when} · ${place}\nAko želiš da dođeš, prijavi se u aplikaciji.${note}`,
          url,
          tag: `reminder-${e.id}`,
        };
      }
      return { title: `Podsetnik: ${e.title}`, body: `${when} · ${place}${note}`, url, tag: `reminder-${e.id}` };
    }
  }
  return null;
}

async function deliver(sub: Sub, message: PushMessage, dead: string[]) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(message),
      { TTL: 12 * 60 * 60, urgency: "high" },
    );
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // 404/410: uređaj više ne postoji (obrisan browser, isključena obaveštenja…)
    if (status === 404 || status === 410) dead.push(sub.endpoint);
    else console.error("Push nije poslat", status, (err as Error).message);
  }
}

/** Pošalji sve poruke koje čekaju. Bezbedno je pozvati više puta i istovremeno. */
export async function sendPendingPushes() {
  const admin = setup();
  if (!admin) return;

  for (let round = 0; round < 10; round++) {
    const { data, error } = await admin.rpc("claim_push_outbox", { p_limit: BATCH });
    if (error) {
      console.error("Push red nije preuzet", error.message);
      return;
    }
    const rows = ((data ?? []) as OutboxRow[]).filter((r) => Date.now() - new Date(r.created_at).getTime() < MAX_AGE_MS);
    if (rows.length) {
      const memberIds = [...new Set(rows.map((r) => r.member_id))];
      const eventIds = [...new Set(rows.map((r) => r.event_id).filter((id): id is string => Boolean(id)))];
      const [{ data: subs }, { data: events }] = await Promise.all([
        admin.from("push_subscriptions").select("endpoint, member_id, p256dh, auth").in("member_id", memberIds),
        eventIds.length
          ? admin
              .from("events")
              .select("id, title, starts_at, location, status, cancel_reason, organizer:members!events_organizer_id_fkey(first_name)")
              .in("id", eventIds)
          : Promise.resolve({ data: [] }),
      ]);
      const eventById = new Map(((events ?? []) as unknown as PushEvent[]).map((e) => [e.id, e]));
      const subsByMember = new Map<string, Sub[]>();
      for (const s of (subs ?? []) as Sub[]) {
        subsByMember.set(s.member_id, [...(subsByMember.get(s.member_id) ?? []), s]);
      }

      const dead: string[] = [];
      const jobs: Promise<void>[] = [];
      for (const row of rows) {
        const event = row.event_id ? eventById.get(row.event_id) : undefined;
        if (!event) continue;
        const message = buildMessage(row, event);
        if (!message) continue;
        for (const sub of subsByMember.get(row.member_id) ?? []) jobs.push(deliver(sub, message, dead));
      }
      await Promise.all(jobs);
      if (dead.length) await admin.from("push_subscriptions").delete().in("endpoint", dead);
    }
    if ((data ?? []).length < BATCH) return;
  }
}

/** Probno obaveštenje na sve uređaje jednog člana. Vraća broj uređaja na koje je poslato. */
export async function sendTestPush(memberId: string) {
  const admin = setup();
  if (!admin) return { ok: false as const, reason: "not_configured" as const };
  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, member_id, p256dh, auth").eq("member_id", memberId);
  const list = (subs ?? []) as Sub[];
  const dead: string[] = [];
  await Promise.all(
    list.map((s) =>
      deliver(s, { title: "Kokobleja 🐔", body: "Obaveštenja rade! Ovako ćeš saznati kad se nešto desi.", url: "/profil", tag: "test" }, dead),
    ),
  );
  if (dead.length) await admin.from("push_subscriptions").delete().in("endpoint", dead);
  return { ok: true as const, devices: list.length - dead.length };
}
