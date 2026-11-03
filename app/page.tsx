import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { EVENT_SELECT, UPCOMING_GRACE_MS, type EventRow } from "@/lib/events";
import { requireMember } from "@/lib/member";
import { dayNumber, monthShort, timeOnly, weekdayShort } from "@/lib/time";

type Tab = "predstojeci" | "moji" | "prosli";
const TABS: { key: Tab; label: string }[] = [
  { key: "predstojeci", label: "Predstojeći" },
  { key: "moji", label: "Moji eventi" },
  { key: "prosli", label: "Prošli" },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { supabase, member } = await requireMember();
  const { tab: tabParam } = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === tabParam) ? (tabParam as Tab) : "predstojeci";

  const cutoff = new Date(Date.now() - UPCOMING_GRACE_MS).toISOString();
  let query = supabase.from("events").select(EVENT_SELECT);
  if (tab === "prosli") {
    query = query.lt("starts_at", cutoff).order("starts_at", { ascending: false }).limit(50);
  } else {
    query = query.gte("starts_at", cutoff).order("starts_at", { ascending: true });
    if (tab === "moji") query = query.eq("organizer_id", member.id);
  }
  const { data } = await query.returns<EventRow[]>();
  const events = data ?? [];

  return (
    <>
      <main className="page" style={{ paddingBottom: 160 }}>
        <Logo />
        <h1 className="display">Ćao, {member.first_name}!</h1>

        <nav className="tabs" aria-label="Filter eventova">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "predstojeci" ? "/" : `/?tab=${t.key}`}
              className={`tab${tab === t.key ? " tab-active" : ""}`}
              aria-current={tab === t.key ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {events.length === 0 ? (
          <div className="card stack" style={{ textAlign: "center", padding: 28 }}>
            <strong>
              {tab === "prosli" ? "Još nema prošlih eventova." : tab === "moji" ? "Nemaš predstojećih eventova." : "Nema predstojećih eventova."}
            </strong>
            {tab !== "prosli" && <span className="muted">Napravi prvi i pozovi ekipu!</span>}
          </div>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            {events.map((e) => {
              const cancelled = e.status === "cancelled";
              return (
                <Link key={e.id} href={`/eventi/${e.id}`} className={`event-card${cancelled ? " event-cancelled" : ""}`}>
                  <div className="datebox">
                    <span className="datebox-wd">{weekdayShort(e.starts_at)}</span>
                    <span className="datebox-day">{dayNumber(e.starts_at)}</span>
                    <span className="datebox-mo">{monthShort(e.starts_at)}</span>
                  </div>
                  <div className="stack" style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <div className="spread" style={{ alignItems: "flex-start" }}>
                      <span className="event-title">{e.title}</span>
                      {cancelled ? (
                        <span className="pill pill-cancelled">Otkazano</span>
                      ) : e.organizer_id === member.id ? (
                        <span className="pill pill-pending">Organizuješ</span>
                      ) : null}
                    </div>
                    <span className="muted" style={{ fontSize: 14 }}>
                      {timeOnly(e.starts_at)} · {e.location}
                    </span>
                    {e.max_spots && !cancelled && (
                      <span className="small muted" style={{ fontWeight: 600 }}>
                        Do {e.max_spots} mesta
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Link href="/eventi/novi" className="fab">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Novi event
      </Link>
      <BottomNav active="eventi" isAdmin={member.role === "admin"} />
    </>
  );
}
