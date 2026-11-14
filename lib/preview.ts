import { cache } from "react";
import { createClient as createSupabase } from "@supabase/supabase-js";

export type EventPreview = { title: string; starts_at: string; cancelled: boolean };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Naziv i vreme eventa za preview u Viberu. Radi i bez prijave (SQL funkcija event_preview).
export const getEventPreview = cache(async (id: string): Promise<EventPreview | null> => {
  if (!UUID_RE.test(id)) return null;
  const supabase = createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await supabase.rpc("event_preview", { p_event_id: id });
  const row = Array.isArray(data) ? data[0] : null;
  return row ? (row as EventPreview) : null;
});
