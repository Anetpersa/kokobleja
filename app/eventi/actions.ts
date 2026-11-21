"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { CATEGORIES } from "@/lib/events";
import { requireMember } from "@/lib/member";
import { sendPendingPushes } from "@/lib/push";
import { belgradeInputToDate } from "@/lib/time";

function clean(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

// Obaveštenja koja je baza upravo pripremila šaljemo odmah posle odgovora, da ekran ne čeka
function pushLater() {
  after(sendPendingPushes);
}

function fail(path: string, message: string): never {
  redirect(`${path}?greska=${encodeURIComponent(message)}`);
}

const CATEGORY_KEYS = new Set<string>(CATEGORIES.map((c) => c.key));

function readEventForm(formData: FormData, path: string) {
  const title = clean(formData.get("title"));
  const locationTbd = formData.get("location_tbd") === "on";
  const location = locationTbd ? null : clean(formData.get("location"));
  const categoryRaw = clean(formData.get("category"));
  const category = categoryRaw && CATEGORY_KEYS.has(categoryRaw) ? categoryRaw : null;
  const description = clean(formData.get("description"));
  const startsAt = belgradeInputToDate(String(formData.get("starts_at") ?? ""));
  const maxRaw = clean(formData.get("max_spots"));
  const maxSpots = maxRaw ? Number(maxRaw) : null;

  if (!title) fail(path, "Upiši naziv eventa.");
  if (!startsAt) fail(path, "Izaberi datum i vreme.");
  if (!location && !locationTbd) fail(path, "Upiši mesto ili označi da još nije određeno.");
  if (maxSpots !== null && (!Number.isInteger(maxSpots) || maxSpots < 1)) {
    fail(path, "Broj mesta mora biti ceo broj veći od nule.");
  }

  return {
    title,
    location,
    category,
    description,
    starts_at: startsAt.toISOString(),
    max_spots: maxSpots,
  };
}

export async function createEvent(formData: FormData) {
  const { supabase, member } = await requireMember();
  const values = readEventForm(formData, "/eventi/novi");

  const { data, error } = await supabase
    .from("events")
    .insert({ ...values, organizer_id: member.id })
    .select("id")
    .single();
  if (error || !data) fail("/eventi/novi", "Čuvanje nije uspelo. Probaj ponovo.");

  // Organizator automatski dolazi na svoj event (može da se odjavi)
  await supabase.rpc("set_rsvp", { p_event_id: data.id, p_status: "going" });

  pushLater();
  revalidatePath("/");
  // Event je sačuvan bez obzira na deljenje; stranica eventa nudi „Podeli u Viber”
  redirect(`/eventi/${data.id}?novo=1`);
}

export async function updateEvent(formData: FormData) {
  const { supabase } = await requireMember();
  const id = String(formData.get("id"));
  const values = readEventForm(formData, `/eventi/${id}/izmeni`);

  const { error } = await supabase.from("events").update(values).eq("id", id);
  if (error) fail(`/eventi/${id}/izmeni`, "Čuvanje nije uspelo.");
  // Obaveštenje prijavljenima (ako su promenjeni datum, vreme ili mesto) pravi baza

  pushLater();
  revalidatePath("/");
  revalidatePath(`/eventi/${id}`);
  redirect(`/eventi/${id}`);
}

export async function cancelEvent(formData: FormData) {
  const { supabase } = await requireMember();
  const id = String(formData.get("id"));
  const reasonChoice = clean(formData.get("reason"));
  const note = clean(formData.get("note"));
  const reason = [reasonChoice, note].filter(Boolean).join(" · ") || null;

  const { error } = await supabase
    .from("events")
    .update({ status: "cancelled", cancel_reason: reason, cancelled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fail(`/eventi/${id}/otkazi`, "Otkazivanje nije uspelo.");
  // Obaveštenje prijavljenima pravi baza (triger)

  pushLater();
  revalidatePath("/");
  revalidatePath(`/eventi/${id}`);
  redirect(`/eventi/${id}?otkazano=1`);
}

export async function restoreEvent(formData: FormData) {
  const { supabase } = await requireMember();
  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("events")
    .update({ status: "active", cancel_reason: null, cancelled_at: null })
    .eq("id", id);
  if (error) fail(`/eventi/${id}`, "Vraćanje nije uspelo.");

  pushLater();
  revalidatePath("/");
  revalidatePath(`/eventi/${id}`);
  redirect(`/eventi/${id}`);
}

export async function deleteEvent(formData: FormData) {
  const { supabase } = await requireMember();
  const id = String(formData.get("id"));

  const { error, count } = await supabase.from("events").delete({ count: "exact" }).eq("id", id);
  if (error || !count) {
    fail(`/eventi/${id}`, "Brisanje nije uspelo. Ako su se ljudi već prijavili, otkaži event umesto brisanja.");
  }

  revalidatePath("/");
  redirect("/");
}

// ---------- Prijave ----------
export async function setRsvp(formData: FormData) {
  const { supabase } = await requireMember();
  const id = String(formData.get("id"));
  const status = formData.get("status") === "maybe" ? "maybe" : "going";

  const { data, error } = await supabase.rpc("set_rsvp", { p_event_id: id, p_status: status });
  if (error) fail(`/eventi/${id}`, error.message);

  pushLater();
  revalidatePath("/");
  revalidatePath(`/eventi/${id}`);
  redirect(data === "waitlist" ? `/eventi/${id}?cekanje=1` : `/eventi/${id}`);
}

export async function cancelRsvp(formData: FormData) {
  const { supabase } = await requireMember();
  const id = String(formData.get("id"));

  const { error } = await supabase.rpc("cancel_rsvp", { p_event_id: id });
  if (error) fail(`/eventi/${id}`, error.message);

  pushLater();
  revalidatePath("/");
  revalidatePath(`/eventi/${id}`);
  redirect(`/eventi/${id}`);
}

// ---------- Podsetnik („Podseti ekipu”) ----------
export async function remindEvent(formData: FormData) {
  const { supabase } = await requireMember();
  const id = String(formData.get("id"));
  const audience = formData.get("audience") === "unsigned" ? "unsigned" : "signed";
  const message = clean(formData.get("message"));

  const { data, error } = await supabase.rpc("remind_event", {
    p_event_id: id,
    p_audience: audience,
    p_message: message,
  });
  if (error) fail(`/eventi/${id}/podseti`, error.message);

  pushLater();
  revalidatePath(`/eventi/${id}/podseti`);
  redirect(`/eventi/${id}?podsetnik=${Number(data ?? 0)}`);
}

// ---------- Komentari ----------
export type CommentState = { error: string | null; sent: number };

export async function addComment(prev: CommentState, formData: FormData): Promise<CommentState> {
  const { supabase, member } = await requireMember();
  const eventId = String(formData.get("event_id"));
  const body = clean(formData.get("body"));

  if (!body) return { ...prev, error: "Komentar je prazan." };
  if (body.length > 1000) return { ...prev, error: "Komentar može da ima najviše 1000 znakova." };

  const { error } = await supabase.from("comments").insert({ event_id: eventId, member_id: member.id, body });
  if (error) {
    return { ...prev, error: "Slanje nije uspelo. Komentarišu samo oni koji su kliknuli Dolazim ili Možda, a na otkazanom eventu su komentari zaključani." };
  }

  pushLater();
  revalidatePath(`/eventi/${eventId}`);
  return { error: null, sent: prev.sent + 1 };
}

export type EditCommentState = { error: string | null; saved: number };

export async function editComment(prev: EditCommentState, formData: FormData): Promise<EditCommentState> {
  const { supabase } = await requireMember();
  const id = String(formData.get("id"));
  const eventId = String(formData.get("event_id"));
  const body = clean(formData.get("body"));

  if (!body) return { ...prev, error: "Komentar je prazan." };
  if (body.length > 1000) return { ...prev, error: "Komentar može da ima najviše 1000 znakova." };

  const { error } = await supabase.rpc("edit_comment", { p_id: id, p_body: body });
  if (error) return { ...prev, error: "Izmena nije uspela. Ako je event otkazan, komentari su zaključani." };

  revalidatePath(`/eventi/${eventId}`);
  return { error: null, saved: prev.saved + 1 };
}

export async function deleteComment(formData: FormData) {
  const { supabase } = await requireMember();
  const id = String(formData.get("id"));
  const eventId = String(formData.get("event_id"));

  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) fail(`/eventi/${eventId}`, "Brisanje komentara nije uspelo.");

  revalidatePath(`/eventi/${eventId}`);
}
