"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/member";

function clean(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function fail(path: string, message: string): never {
  redirect(`${path}?greska=${encodeURIComponent(message)}`);
}

export async function addMember(formData: FormData) {
  const { supabase } = await requireAdmin();
  const firstName = clean(formData.get("first_name"));
  const lastName = clean(formData.get("last_name"));
  if (!firstName) fail("/clanovi", "Upiši bar ime.");

  const { data: member, error } = await supabase
    .from("members")
    .insert({ first_name: firstName, last_name: lastName })
    .select("id")
    .single();
  if (error || !member) fail("/clanovi", "Dodavanje nije uspelo.");

  const { error: inviteError } = await supabase.rpc("create_invite", { p_member_id: member.id });
  if (inviteError) fail("/clanovi", "Član je dodat, ali pozivni link nije napravljen.");

  revalidatePath("/clanovi");
  redirect(`/clanovi?novi=${member.id}`);
}

export async function updateMember(formData: FormData) {
  const { supabase, member: me } = await requireAdmin();
  const id = String(formData.get("id"));
  const path = `/clanovi/${id}`;
  const firstName = clean(formData.get("first_name"));
  const lastName = clean(formData.get("last_name"));
  const role = formData.get("role") === "admin" ? "admin" : "member";
  if (!firstName) fail(path, "Ime ne može biti prazno.");
  if (id === me.id && role !== "admin") fail(path, "Ne možeš sebi da skineš admin ulogu.");

  const { error } = await supabase
    .from("members")
    .update({ first_name: firstName, last_name: lastName, role })
    .eq("id", id);
  if (error) fail(path, "Čuvanje nije uspelo.");

  revalidatePath("/clanovi");
  redirect("/clanovi");
}

export async function unlinkMember(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const { error } = await supabase.rpc("unlink_member", { p_member_id: id });
  if (error) fail(`/clanovi/${id}`, error.message);

  revalidatePath("/clanovi");
  redirect(`/clanovi?novi=${id}`);
}

export async function newInvite(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const { error } = await supabase.rpc("create_invite", { p_member_id: id });
  if (error) fail("/clanovi", "Novi link nije napravljen.");

  revalidatePath("/clanovi");
  redirect(`/clanovi?novi=${id}`);
}

export async function deactivateMember(formData: FormData) {
  const { supabase, member: me } = await requireAdmin();
  const id = String(formData.get("id"));
  if (id === me.id) fail(`/clanovi/${id}`, "Ne možeš da deaktiviraš sebe.");

  const { error } = await supabase.from("members").update({ status: "deactivated" }).eq("id", id);
  if (error) fail(`/clanovi/${id}`, "Deaktivacija nije uspela.");
  // Korak 3: ovde će se brisati njegove prijave na buduće evente i pomerati lista čekanja

  revalidatePath("/clanovi");
  redirect("/clanovi");
}

export async function reactivateMember(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));

  const { data: m } = await supabase
    .from("members")
    .select("auth_user_id")
    .eq("id", id)
    .single();
  const hasAccount = Boolean(m?.auth_user_id);

  const { error } = await supabase
    .from("members")
    .update({ status: hasAccount ? "active" : "pending" })
    .eq("id", id);
  if (error) fail("/clanovi", "Vraćanje nije uspelo.");

  if (!hasAccount) await supabase.rpc("create_invite", { p_member_id: id });

  revalidatePath("/clanovi");
  redirect(hasAccount ? "/clanovi" : `/clanovi?novi=${id}`);
}
