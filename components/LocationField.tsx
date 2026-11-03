"use client";

import { useState } from "react";

export function LocationField({ defaultValue }: { defaultValue?: string | null }) {
  // Postojeći event bez mesta = "još nije određeno"
  const [tbd, setTbd] = useState(defaultValue === null);

  return (
    <div className="stack">
      <label className="field">
        Mesto
        <input
          type="text"
          name="location"
          defaultValue={defaultValue ?? ""}
          placeholder={tbd ? "Upisaćeš kasnije" : "Naziv mesta i adresa"}
          disabled={tbd}
          required={!tbd}
        />
      </label>
      <label className="check">
        <input type="checkbox" name="location_tbd" checked={tbd} onChange={(e) => setTbd(e.target.checked)} />
        <span>Mesto još nije određeno</span>
      </label>
      {!tbd && <span className="small muted">Link ka mapi se pravi automatski iz ovoga.</span>}
    </div>
  );
}
