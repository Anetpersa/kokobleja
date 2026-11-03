import Link from "next/link";
import { EventForm } from "@/components/EventForm";
import { requireMember } from "@/lib/member";
import { createEvent } from "../actions";

export default async function NoviEventPage({ searchParams }: { searchParams: Promise<{ greska?: string }> }) {
  await requireMember();
  const { greska } = await searchParams;

  return (
    <main className="page">
      <Link href="/" className="small">← Nazad</Link>
      <h1 className="display">Novi event</h1>
      {greska && <div className="notice notice-error">{greska}</div>}
      <EventForm action={createEvent} submitLabel="Objavi event" />
    </main>
  );
}
