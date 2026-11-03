import type { Member } from "@/lib/member";

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  location: string;
  max_spots: number | null;
  organizer_id: string;
  status: "active" | "cancelled";
  cancel_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  organizer: Pick<Member, "first_name" | "last_name"> | null;
};

export const EVENT_SELECT = "*, organizer:members!events_organizer_id_fkey(first_name, last_name)";

// Event ostaje među predstojećim još 12 sati posle početka (da večerašnji ne nestane u 19:01)
export const UPCOMING_GRACE_MS = 12 * 60 * 60 * 1000;

export function canManage(event: Pick<EventRow, "organizer_id">, me: Pick<Member, "id" | "role">) {
  return event.organizer_id === me.id || me.role === "admin";
}

export function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export const CANCEL_REASONS = ["Klub zatvoren", "Premalo ljudi", "Organizator sprečen", "Loše vreme"];
