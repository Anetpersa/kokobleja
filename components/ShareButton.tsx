"use client";

import { useState } from "react";

// Otvara sistemski meni za deljenje (Viber...), a na računaru kopira poruku
export function ShareButton({
  text,
  path,
  label = "Podeli link",
  className = "btn btn-outline btn-sm",
}: {
  text: string;
  path: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // zatvorila meni
      }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" className={className} onClick={share}>
      {copied ? "Kopirano, nalepi u Viber" : label}
    </button>
  );
}
