"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteComment, editComment, type EditCommentState } from "@/app/eventi/actions";
import { ConfirmButton } from "@/components/ConfirmButton";

const initial: EditCommentState = { error: null, saved: 0 };

// Jedan komentar: autor može da ga izmeni (dok event nije otkazan) i obriše; admin može da obriše
export function CommentItem({
  id,
  eventId,
  body,
  authorName,
  authorInitials,
  timeLabel,
  edited,
  mine,
  canEdit,
  canDelete,
}: {
  id: string;
  eventId: string;
  body: string;
  authorName: string;
  authorInitials: string;
  timeLabel: string;
  edited: boolean;
  mine: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(editComment, initial);

  // Posle uspešnog čuvanja zatvori polje za izmenu
  useEffect(() => {
    if (state.saved > 0) setEditing(false);
  }, [state.saved]);

  return (
    <li className="comment">
      <span className="avatar avatar-sm">{authorInitials}</span>
      <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <div className="spread" style={{ gap: 8 }}>
          <span className="small">
            <strong>{authorName}</strong>
            <span className="muted">
              {" "}
              · {timeLabel}
              {edited && " · izmenjeno"}
            </span>
          </span>
          {!editing && (canEdit || canDelete) && (
            <span className="row" style={{ gap: 2 }}>
              {canEdit && (
                <button type="button" className="comment-action" onClick={() => setEditing(true)}>
                  Izmeni
                </button>
              )}
              {canDelete && (
                <form action={deleteComment}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="event_id" value={eventId} />
                  <ConfirmButton
                    message={mine ? "Obrisati tvoj komentar?" : "Obrisati ovaj komentar? (brišeš kao admin)"}
                    className="comment-action comment-delete"
                  >
                    Obriši
                  </ConfirmButton>
                </form>
              )}
            </span>
          )}
        </div>

        {editing ? (
          <form action={action} className="stack" style={{ gap: 8, marginTop: 4 }}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="event_id" value={eventId} />
            <textarea
              name="body"
              rows={3}
              maxLength={1000}
              defaultValue={body}
              aria-label="Izmena komentara"
              required
              autoFocus
            />
            {state.error && <div className="notice notice-error">{state.error}</div>}
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={pending}>
                Odustani
              </button>
              <button type="submit" className="btn btn-sm" disabled={pending}>
                {pending ? "Čuvam…" : "Sačuvaj"}
              </button>
            </div>
          </form>
        ) : (
          <p className="comment-body">{body}</p>
        )}
      </div>
    </li>
  );
}
