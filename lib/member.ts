import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Member = {
  id: string;
  first_name: string;
  last_name: string | null;
  role: "member" | "admin";
  status: "pending" | "active" | "deactivated";
  auth_user_id: string | null;
  created_at: string;
};

export function fullName(m: Pick<Member, "first_name" | "last_name">) {
  return [m.first_name, m.last_name].filter(Boolean).join(" ");
}

export function initials(m: Pick<Member, "first_name" | "last_name">) {
  return ((m.first_name?.[0] ?? "") + (m.last_name?.[0] ?? "")).toUpperCase();
}

// Vraća prijavljenog aktivnog člana ili preusmerava (na prijavu ili na "privatna grupa")
export async function requireMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prijava");

  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle<Member>();

  if (!member) redirect("/privatna");
  return { supabase, user, member };
}

export async function requireAdmin() {
  const ctx = await requireMember();
  if (ctx.member.role !== "admin") redirect("/");
  return ctx;
}
