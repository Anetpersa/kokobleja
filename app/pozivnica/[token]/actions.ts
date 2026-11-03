"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_invite", { p_token: token });

  if (error) {
    redirect(`/pozivnica/${token}?greska=${encodeURIComponent(error.message)}`);
  }
  redirect("/");
}
