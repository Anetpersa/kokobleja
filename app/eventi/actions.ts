"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CATEGORIES } from "@/lib/events";
import { requireMember } from "@/lib/member";
import { belgradeInputToDate } from "@/lib/time";

function clean(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
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
  // Korak 6: obaveštenje prijavljenima ako se promene datum, vreme ili mesto

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
  // Korak 6: push obaveštenje prijavljenima

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

  revalidatePath("/");
  revalidatePath(`/eventi/${id}`);
  redirect(`/eventi/${id}`);
}

export async function deleteEvent(formData: FormData) {
  const { supabase } = await requireMember();
  const id = String(formData.get("id"));

  const { error, count } = await supabase.from("events").delete({ count: "exact" }).eq("id", id);
  if (error || !count) fail(`/eventi/${id}`, "Brisanje nije uspelo.");

  revalidatePath("/");
  redirect("/");
}
