"use client";

import { useActionState, useEffect, useRef } from "react";
import { addComment, type CommentState } from "@/app/eventi/actions";

const initial: CommentState = { error: null, sent: 0 };

export function CommentForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(addComment, initial);
  const formRef = useRef<HTMLFormElement>(null);

  // Posle uspešnog slanja isprazni polje
  useEffect(() => {
    if (state.sent > 0) formRef.current?.reset();
  }, [state.sent]);

  return (
    <form ref={formRef} action={action} className="stack" style={{ gap: 8 }}>
      <input type="hidden" name="event_id" value={eventId} />
      <textarea
        name="body"
        rows={2}
        maxLength={1000}
        placeholder="Napiši komentar…"
        aria-label="Komentar"
        required
      />
      {state.error && <div className="notice notice-error">{state.error}</div>}
      <button className="btn btn-sm" type="submit" disabled={pending} style={{ alignSelf: "flex-end" }}>
        {pending ? "Šaljem…" : "Pošalji"}
      </button>
    </form>
  );
}
