import { BackButton } from "@/components/BackButton";
import { notFound, redirect } from "next/navigation";
import { EventForm } from "@/components/EventForm";
import { canManage, EVENT_SELECT, type EventRow } from "@/lib/events";
import { requireMember } from "@/lib/member";
import { updateEvent } from "../../actions";

export default async function IzmeniEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ greska?: string }>;
}) {
  const { id } = await params;
  const { greska } = await searchParams;
  const { supabase, member } = await requireMember();

  const { data: event } = await supabase.from("events").select(EVENT_SELECT).eq("id", id).maybeSingle<EventRow>();
  if (!event) notFound();
  if (!canManage(event, member)) redirect(`/eventi/${id}`);

  return (
    <main className="page">
      <BackButton href={`/eventi/${id}`} label="Nazad na event" />
      <h1 className="display">Izmeni event</h1>
      {greska && <div className="notice notice-error">{greska}</div>}
      <EventForm action={updateEvent} event={event} submitLabel="Sačuvaj izmene" />
    </main>
  );
}
