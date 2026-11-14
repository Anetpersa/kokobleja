import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildIcs } from "@/lib/calendar";
import type { EventRow } from "@/lib/events";

// "Dodaj u kalendar" → .ics fajl. Radi samo za prijavljene članove (RLS u bazi).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { origin } = new URL(request.url);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/prijava?next=${encodeURIComponent(`/eventi/${id}`)}`);

  const { data: event } = await supabase
    .from("events")
    .select("id, title, description, starts_at, location, updated_at, status")
    .eq("id", id)
    .maybeSingle<Pick<EventRow, "id" | "title" | "description" | "starts_at" | "location" | "updated_at" | "status">>();
  if (!event) return NextResponse.redirect(`${origin}/privatna`);

  return new NextResponse(buildIcs(event, event.status === "cancelled"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="kokobleja-event.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
