import { CommentForm } from "@/components/CommentForm";
import { CommentItem } from "@/components/CommentItem";
import { CommentsLive } from "@/components/CommentsLive";
import type { CommentRow } from "@/lib/events";
import { fullName, initials, type Member } from "@/lib/member";
import { timeAgo } from "@/lib/time";

// Komentari ispod eventa: pišu samo prijavljeni (Dolazim, Možda, lista čekanja);
// autor menja i briše svoj, admin briše bilo koji; na otkazanom eventu nema novih ni izmena
export function Comments({
  eventId,
  comments,
  me,
  locked,
  signedUp,
  past,
}: {
  eventId: string;
  comments: CommentRow[];
  me: Pick<Member, "id" | "role">;
  locked: boolean;
  signedUp: boolean;
  past: boolean;
}) {
  return (
    <section id="komentari" className="card stack" style={{ gap: 12 }}>
      <CommentsLive eventId={eventId} commentIds={comments.map((c) => c.id)} />
      <strong>Komentari{comments.length > 0 ? ` (${comments.length})` : ""}</strong>

      {comments.length === 0 && !locked && signedUp && (
        <span className="small muted">Još nema komentara. Pitaj nešto ili javi da kasniš.</span>
      )}

      {comments.length > 0 && (
        <ul className="comments">
          {comments.map((c) => {
            const mine = c.member_id === me.id;
            return (
              <CommentItem
                key={c.id}
                id={c.id}
                eventId={eventId}
                body={c.body}
                authorName={c.member ? fullName(c.member) : "Bivši član"}
                authorInitials={c.member ? initials(c.member) : "?"}
                timeLabel={timeAgo(c.created_at)}
                edited={c.edited_at !== null}
                mine={mine}
                canEdit={mine && !locked}
                canDelete={mine || me.role === "admin"}
              />
            );
          })}
        </ul>
      )}

      {locked ? (
        <span className="small muted">Event je otkazan, pa su komentari zaključani.</span>
      ) : signedUp ? (
        <CommentForm eventId={eventId} />
      ) : (
        <span className="small muted">
          Komentarišu samo oni koji su kliknuli Dolazim ili Možda.{past ? "" : " Prijavi se gore, pa možeš da pišeš."}
        </span>
      )}
    </section>
  );
}
