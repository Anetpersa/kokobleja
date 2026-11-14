import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPendingPushes } from "@/lib/push";

// "Budilnik" za bazu: Vercel ga poziva jednom dnevno (vercel.json → crons).
// Supabase na besplatnom planu pauzira projekat posle 7 dana bez aktivnosti,
// a ovaj mali upit svaki dan drži bazu budnom. Ne čita ni ne menja nikakve podatke.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Traži nepostojeći event: pravi upit u bazi, a ne vraća ništa
  const { error } = await supabase.rpc("event_preview", { p_event_id: "00000000-0000-0000-0000-000000000000" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  // Usput pošalje (ili počisti) obaveštenja koja su iz nekog razloga zaostala
  await sendPendingPushes().catch(() => {});
  return NextResponse.json({ ok: true, vreme: new Date().toISOString() });
}
