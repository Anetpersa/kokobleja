"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription, testPush } from "@/app/profil/actions";
import { detectPlatform, isStandalone } from "@/lib/install";
import { currentSubscription, permission, pushSupport, subscribe, toKeys, type PushSupport } from "@/lib/push-client";

const DISMISS_KEY = "kokobleja-push-banner";

type State = {
  support: PushSupport;
  permission: NotificationPermission;
  subscribed: boolean;
  dismissed: boolean;
};

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function BlockedHelp() {
  const platform = detectPlatform();
  const installed = isStandalone();
  if (platform === "ios") {
    return <span>Otvori <b>Podešavanja</b> na telefonu → <b>Obaveštenja</b> → <b>Kokobleja</b> → uključi <b>Dozvoli obaveštenja</b>. Zatim zatvori i ponovo otvori Kokobleju.</span>;
  }
  if (platform === "android" && installed) {
    return <span>Dugo drži ikonicu Kokobleje na početnom ekranu → <b>ⓘ Informacije o aplikaciji</b> → <b>Obaveštenja</b> → uključi. Zatim ponovo otvori Kokobleju.</span>;
  }
  if (platform === "android") {
    return <span>U Chrome-u tapni ikonicu levo od adrese → <b>Dozvole</b> → <b>Obaveštenja</b> → <b>Dozvoli</b>, pa osveži stranicu.</span>;
  }
  return <span>Klikni ikonicu levo od adrese sajta → <b>Obaveštenja</b> → <b>Dozvoli</b>, pa osveži stranicu.</span>;
}

/**
 * Obaveštenja na ovom uređaju.
 * - variant="card": u Profilu, uvek (prekidač, probno obaveštenje, objašnjenja)
 * - variant="banner": na početnoj, samo u instaliranoj aplikaciji dok obaveštenja nisu uključena
 */
export function PushToggle({ variant }: { variant: "card" | "banner" }) {
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const support = pushSupport();
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      } catch {}
      let subscribed = false;
      if (support === "ok" && permission() === "granted") {
        const sub = await currentSubscription();
        const keys = sub && toKeys(sub);
        if (keys) {
          subscribed = true;
          savePushSubscription(keys).catch(() => {}); // osveži adresu uređaja u bazi
        }
      }
      if (alive) setS({ support, permission: support === "ok" ? permission() : "default", subscribed, dismissed });
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!s) return null;

  if (variant === "banner") {
    if (s.support !== "ok" || !isStandalone() || s.subscribed || s.dismissed || s.permission === "denied") return null;
  }

  async function turnOn() {
    setBusy(true);
    setNote(null);
    try {
      const sub = await subscribe();
      if (!sub) {
        const p = permission();
        setS((prev) => (prev ? { ...prev, permission: p } : prev));
        if (p !== "denied") setNote("Obaveštenja nisu uključena. Probaj ponovo i izaberi „Dozvoli”.");
        return;
      }
      const keys = toKeys(sub);
      const res = keys ? await savePushSubscription(keys) : { ok: false };
      if (!res.ok) {
        setNote("Uključivanje nije uspelo. Probaj ponovo.");
        return;
      }
      setS((prev) => (prev ? { ...prev, permission: "granted", subscribed: true } : prev));
      setNote("Obaveštenja su uključena! Tapni „Pošalji probno” da proveriš.");
    } catch (e) {
      // Tehnički detalj na kraju poruke pomaže da se otkrije uzrok
      const err = e as Error;
      const detail = err?.message === "no-sw" ? "service worker nije spreman" : `${err?.name ?? "Greška"}: ${err?.message ?? ""}`;
      setNote(`Uključivanje nije uspelo. Probaj ponovo. (${detail})`);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setNote(null);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setS((prev) => (prev ? { ...prev, subscribed: false } : prev));
      setNote("Obaveštenja su isključena na ovom uređaju.");
    } catch {
      setNote("Isključivanje nije uspelo. Probaj ponovo.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setNote(null);
    try {
      const res = await testPush();
      if (!res.ok) setNote("Slanje obaveštenja još nije podešeno na serveru.");
      else if (res.devices === 0) {
        setS((prev) => (prev ? { ...prev, subscribed: false } : prev));
        setNote("Ovaj uređaj više nije prijavljen za obaveštenja. Uključi ih ponovo.");
      } else setNote("Poslato! Obaveštenje bi trebalo da stigne za nekoliko sekundi.");
    } catch {
      setNote("Slanje nije uspelo. Probaj ponovo.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setS((prev) => (prev ? { ...prev, dismissed: true } : prev));
  }

  const header = (
    <div className="spread" style={{ alignItems: "flex-start" }}>
      <div className="row" style={{ gap: 10 }}>
        <span className="install-icon"><BellIcon /></span>
        <strong>Obaveštenja</strong>
      </div>
      {variant === "banner" && (
        <button type="button" className="inapp-close install-close" onClick={dismiss} aria-label="Zatvori">×</button>
      )}
    </div>
  );

  const what = (
    <span className="small muted" style={{ lineHeight: 1.45 }}>
      Novi eventi, otkazivanja i izmene, mesto sa liste čekanja, komentari i podsetnici za evente na koje si
      prijavljen/a.
    </span>
  );

  let body: React.ReactNode;
  if (s.support === "viber") {
    body = <span className="small">Otvori Kokobleju u Chrome-u ili Safariju (ne u Viberu) da uključiš obaveštenja.</span>;
  } else if (s.support === "ios-not-installed") {
    body = (
      <span className="small" style={{ lineHeight: 1.45 }}>
        Na iPhone-u obaveštenja rade samo u <b>instaliranoj</b> aplikaciji. Prvo instaliraj Kokobleju (uputstvo je iznad),
        otvori je sa početnog ekrana i ovde uključi obaveštenja.
      </span>
    );
  } else if (s.support === "ios-too-old") {
    body = <span className="small">Za obaveštenja na iPhone-u potreban je iOS 16.4 ili noviji (Podešavanja → Opšte → Ažuriranje softvera).</span>;
  } else if (s.support === "unsupported") {
    body = <span className="small">Ovaj browser ne podržava obaveštenja. Probaj u Chrome-u.</span>;
  } else if (s.permission === "denied") {
    body = (
      <div className="notice small stack" style={{ gap: 4, lineHeight: 1.45 }}>
        <strong>Obaveštenja su blokirana na ovom uređaju.</strong>
        <BlockedHelp />
      </div>
    );
  } else if (s.subscribed) {
    body = (
      <>
        <span className="push-on">✓ Uključena na ovom uređaju</span>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={sendTest} disabled={busy} style={{ flex: 1 }}>
            Pošalji probno
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={turnOff} disabled={busy} style={{ flex: 1 }}>
            Isključi
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <button type="button" className="btn btn-block" onClick={turnOn} disabled={busy}>
        {busy ? "Uključujem…" : "Uključi obaveštenja"}
      </button>
    );
  }

  return (
    <div className={`card install-card${variant === "banner" ? " install-banner" : ""}`}>
      {header}
      {what}
      {body}
      {note && <span className="small" role="status">{note}</span>}
      {variant === "card" && s.support === "ok" && (
        <span className="small muted" style={{ lineHeight: 1.45 }}>
          Podešava se posebno na svakom uređaju (telefon, računar).
        </span>
      )}
      {variant === "banner" && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss} style={{ alignSelf: "flex-start" }}>
          Ne sada (možeš i kasnije, iz Profila)
        </button>
      )}
    </div>
  );
}
