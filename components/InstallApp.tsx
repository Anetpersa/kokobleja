"use client";

import { useEffect, useState } from "react";
import {
  canPromptInstall,
  detectPlatform,
  isStandalone,
  justInstalled,
  promptInstall,
  subscribeInstall,
  type Platform,
} from "@/lib/install";

const DISMISS_KEY = "kokobleja-install-banner";

type State = {
  platform: Platform;
  standalone: boolean;
  canPrompt: boolean;
  installed: boolean;
  inViber: boolean;
  dismissed: boolean;
};

function readState(): State {
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(DISMISS_KEY) === "1";
  } catch {}
  return {
    platform: detectPlatform(),
    standalone: isStandalone(),
    canPrompt: canPromptInstall(),
    installed: justInstalled(),
    inViber: /Viber/i.test(navigator.userAgent),
    dismissed,
  };
}

function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M12 7v7M9 11l3 3 3-3" />
    </svg>
  );
}

/**
 * „Instaliraj aplikaciju”.
 * - variant="banner": na početnoj, može da se skloni (pamti se na tom uređaju)
 * - variant="card": u Profilu, uvek tu dok app nije instaliran
 */
export function InstallApp({ variant }: { variant: "banner" | "card" }) {
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setS(readState());
    return subscribeInstall(() => setS(readState()));
  }, []);

  if (!s) return null;
  if (s.inViber) return null; // u Viberu već stoji poruka da se otvori pravi browser

  if (s.standalone || s.installed) {
    if (variant === "banner") return null;
    return (
      <div className="card install-card install-done">
        <strong>✓ {s.installed ? "Instalirano! Otvori Kokobleju sa početnog ekrana." : "Kokobleja je instalirana na ovom uređaju."}</strong>
      </div>
    );
  }

  if (variant === "banner") {
    if (s.dismissed) return null;
    if (s.platform === "desktop" && !s.canPrompt) return null;
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setS((prev) => (prev ? { ...prev, dismissed: true } : prev));
  }

  async function install() {
    setBusy(true);
    await promptInstall();
    setBusy(false);
  }

  return (
    <div className={`card install-card${variant === "banner" ? " install-banner" : ""}`}>
      <div className="spread" style={{ alignItems: "flex-start" }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="install-icon"><PhoneIcon /></span>
          <strong>Instaliraj Kokobleju</strong>
        </div>
        {variant === "banner" && (
          <button type="button" className="inapp-close install-close" onClick={dismiss} aria-label="Zatvori">×</button>
        )}
      </div>

      <span className="small muted" style={{ lineHeight: 1.45 }}>
        Dobiješ ikonicu na početnom ekranu, a Kokobleja se otvara preko celog ekrana, kao prava aplikacija.
      </span>

      {s.canPrompt ? (
        <button type="button" className="btn btn-block" onClick={install} disabled={busy}>
          Instaliraj aplikaciju
        </button>
      ) : s.platform === "ios" ? (
        <ol className="install-steps">
          <li>
            Tapni dugme za deljenje <ShareGlyph /> (u Safariju je na dnu ekrana, a u novijim verzijama prvo tapni <b>⋯</b>).
          </li>
          <li>
            Izaberi <b>„Dodaj na početni ekran”</b> (Add to Home Screen). Ako ga ne vidiš, skroluj nadole.
          </li>
          <li>Tapni <b>„Dodaj”</b>, pa otvori Kokobleju sa početnog ekrana.</li>
          <li>U aplikaciji se prijaviš još jednom, kodom iz mejla.</li>
        </ol>
      ) : s.platform === "android" ? (
        <ol className="install-steps">
          <li>U Chrome-u tapni <b>⋮</b> gore desno.</li>
          <li>
            Izaberi <b>„Instaliraj aplikaciju”</b> ili <b>„Dodaj na početni ekran”</b>.
          </li>
        </ol>
      ) : (
        <span className="small muted">
          Na računaru: u Chrome-u ili Edge-u klikni ikonicu za instalaciju desno u adresnoj traci. Najviše smisla ima na telefonu.
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

function ShareGlyph() {
  return (
    <svg className="inline-glyph" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="ikonica za deljenje">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}
