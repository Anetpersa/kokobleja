"use server";

import { requireMember } from "@/lib/member";
import { sendTestPush } from "@/lib/push";
import type { SubscriptionKeys } from "@/lib/push-client";

// Uključi obaveštenja na ovom uređaju (poziva se i pri svakom otvaranju, da baza ima svežu adresu uređaja)
export async function savePushSubscription(keys: SubscriptionKeys) {
  const { supabase } = await requireMember();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: keys.endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
  });
  return { ok: !error };
}

export async function removePushSubscription(endpoint: string) {
  const { supabase } = await requireMember();
  const { error } = await supabase.rpc("remove_push_subscription", { p_endpoint: endpoint });
  return { ok: !error };
}

export async function testPush() {
  const { member } = await requireMember();
  return sendTestPush(member.id);
}
