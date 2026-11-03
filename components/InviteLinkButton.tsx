"use client";

import { useState } from "react";

// Kopira lični pozivni link ili otvara meni za deljenje (npr. u Viber)
export function InviteLinkButton({ token, name }: { token: string; name: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = `${window.location.origin}/pozivnica/${token}`;
    const text = `Ćao ${name}! Ovo je tvoj lični link za Kokobleju (ne prosleđuj ga):`;
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch {
        // korisnik je zatvorio meni, kopiraj umesto toga
      }
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={handleClick}>
      {copied ? "Kopirano!" : "Pozivni link"}
    </button>
  );
}
