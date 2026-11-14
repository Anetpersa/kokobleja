import { deleteComment } from "@/app/eventi/actions";
import { CommentForm } from "@/components/CommentForm";
import { CommentsLive } from "@/components/CommentsLive";
import { ConfirmButton } from "@/components/ConfirmButton";
import type { CommentRow } from "@/lib/events";
import { fullName, initials, type Member } from "@/lib/member";
import { timeAgo } from "@/lib/time";

// Komentari ispod eventa: autor briše svoj, admin bilo koji; na otkazanom eventu nema novih
export function Comments({
  eventId,
  comments,
  me,
  locked,
}: {
  eventId: string;
  comments: CommentRow[];
  me: Pick<Member, "id" | "role">;
  locked: boolean;
}) {
  return (
    <section className="card stack" style={{ gap: 12 }}>
      <CommentsLive eventId={eventId} commentIds={comments.map((c) => c.id)} />
      <strong>Komentari{comments.length > 0 ? ` (${comments.length})` : ""}</strong>

      {comments.length === 0 && !locked && (
        <span className="small muted">Još nema komentara. Pitaj nešto ili javi da kasniš.</span>
      )}

      {comments.length > 0 && (
        <ul className="comments">
          {comments.map((c) => {
            const mine = c.member_id === me.id;
            return (
              <li key={c.id} className="comment">
                <span className="avatar avatar-sm">{c.member ? initials(c.member) : "?"}</span>
                <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                  <div className="spread" style={{ gap: 8 }}>
                    <span className="small">
                      <strong>{c.member ? fullName(c.member) : "Bivši član"}</strong>
                      <span className="muted"> · {timeAgo(c.created_at)}</span>
                    </span>
                    {(mine || me.role === "admin") && (
                      <form action={deleteComment}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="event_id" value={eventId} />
                        <ConfirmButton
                          message={mine ? "Obrisati tvoj komentar?" : "Obrisati ovaj komentar? (brišeš kao admin)"}
                          className="comment-delete"
                        >
                          Obriši
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                  <p className="comment-body">{c.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {locked ? (
        <span className="small muted">Event je otkazan, pa su komentari zaključani.</span>
      ) : (
        <CommentForm eventId={eventId} />
      )}
    </section>
  );
}
