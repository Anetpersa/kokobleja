"use client";

import { useState } from "react";
import { signOut } from "@/app/prijava/actions";
import { removePushSubscription } from "@/app/profil/actions";
import { currentSubscription } from "@/lib/push-client";

// Pre odjave isključi obaveštenja na ovom uređaju, da ne bi stizala nekome ko više nije prijavljen
export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      const sub = await Promise.race([
        currentSubscription(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      if (sub) {
        await removePushSubscription(sub.endpoint).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
    } catch {}
    await signOut();
  }

  return (
    <button className="btn btn-outline btn-block" type="button" onClick={handle} disabled={busy}>
      {busy ? "Odjavljujem…" : "Odjavi se"}
    </button>
  );
}
