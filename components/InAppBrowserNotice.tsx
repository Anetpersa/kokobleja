"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "kokobleja-viber-notice";

// Kad se link otvori iz Vibera, otvara se Viberov ugrađeni browser. U njemu prijava
// često ne ostaje zapamćena, a "Dodaj u kalendar" ne radi pouzdano, pa nudimo pravi browser.
export function InAppBrowserNotice() {
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (!/Viber/i.test(ua)) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {}
    setPlatform(/Android/i.test(ua) ? "android" : "ios");
  }, []);

  if (!platform) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setPlatform(null);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  const { host, pathname, search, href } = window.location;
  const intentUrl = `intent://${host}${pathname}${search}#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(href)};end`;

  return (
    <div className="inapp-notice" role="status">
      <div className="spread" style={{ alignItems: "flex-start" }}>
        <strong>Otvoreno u Viberu</strong>
        <button type="button" className="inapp-close" onClick={dismiss} aria-label="Zatvori">×</button>
      </div>
      <span>
        Viberov browser često ne pamti prijavu, a dodavanje u kalendar u njemu ne radi. Bolje otvori
        Kokobleju u {platform === "android" ? "Chrome-u" : "Safariju"}
        {platform === "android"
          ? ": dugme ispod, ili ⋮ gore desno → „Otvori u browseru”."
          : ": tapni ikonicu za deljenje ili ⋯ i izaberi „Otvori u Safariju”."}
      </span>
      <div className="row" style={{ gap: 8 }}>
        {platform === "android" && (
          <a className="btn btn-sm btn-viber" href={intentUrl}>Otvori u browseru</a>
        )}
        <button type="button" className="btn btn-sm btn-outline" onClick={copy}>
          {copied ? "Kopirano!" : "Kopiraj link"}
        </button>
      </div>
    </div>
  );
}
