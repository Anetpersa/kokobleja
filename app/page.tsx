import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { categoryLabel, EVENT_SELECT, LOCATION_TBD, UPCOMING_GRACE_MS, type EventRow, type RsvpStatus } from "@/lib/events";
import { requireMember } from "@/lib/member";
import { dayNumber, monthShort, timeOnly, weekdayShort } from "@/lib/time";

type Tab = "predstojeci" | "dolazim" | "moji" | "prosli";
const TABS: { key: Tab; label: string }[] = [
  { key: "predstojeci", label: "Predstojeći" },
  { key: "dolazim", label: "Dolazim" },
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
  let events = data ?? [];

  // Prijave za prikazane evente (brojke na karticama + moj status)
  const ids = events.map((e) => e.id);
  const { data: rsvpData } = ids.length
    ? await supabase.from("rsvps").select("event_id, member_id, status").in("event_id", ids)
    : { data: [] as { event_id: string; member_id: string; status: RsvpStatus }[] };
  const stats = new Map<string, { going: number; maybe: number; waitlist: number; mine: RsvpStatus | null }>();
  for (const e of events) stats.set(e.id, { going: 0, maybe: 0, waitlist: 0, mine: null });
  for (const r of rsvpData ?? []) {
    const st = stats.get(r.event_id);
    if (!st) continue;
    st[r.status as RsvpStatus] += 1;
    if (r.member_id === member.id) st.mine = r.status as RsvpStatus;
  }
  if (tab === "dolazim") events = events.filter((e) => stats.get(e.id)?.mine);

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
              {tab === "prosli"
                ? "Još nema prošlih eventova."
                : tab === "moji"
                  ? "Nemaš predstojećih eventova."
                  : tab === "dolazim"
                    ? "Nisi prijavljen/a ni na jedan event."
                    : "Nema predstojećih eventova."}
            </strong>
            {(tab === "predstojeci" || tab === "moji") && <span className="muted">Napravi prvi i pozovi ekipu!</span>}
          </div>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            {events.map((e) => {
              const cancelled = e.status === "cancelled";
              const st = stats.get(e.id)!;
              const full = e.max_spots !== null && st.going >= e.max_spots;
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
                      ) : st.mine === "going" ? (
                        <span className="pill pill-going">Dolaziš</span>
                      ) : st.mine === "maybe" ? (
                        <span className="pill pill-off">Možda</span>
                      ) : st.mine === "waitlist" ? (
                        <span className="pill pill-pending">Čekaš mesto</span>
                      ) : full && tab !== "prosli" ? (
                        <span className="pill pill-full">Popunjeno</span>
                      ) : null}
                    </div>
                    <span className="muted" style={{ fontSize: 14 }}>
                      {timeOnly(e.starts_at)} · {e.location ?? LOCATION_TBD}
                    </span>
                    <div className="row" style={{ gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                      {e.category && (
                        <span className={`pill cat-${e.category}`}>{categoryLabel(e.category)}</span>
                      )}
                      <span className="small muted" style={{ fontWeight: 600 }}>
                        {e.max_spots ? `${st.going}/${e.max_spots}` : st.going} {tab === "prosli" ? "došlo" : "dolazi"}
                        {st.maybe > 0 && ` · ${st.maybe} možda`}
                        {st.waitlist > 0 && tab !== "prosli" && ` · ${st.waitlist} čeka`}
                      </span>
                    </div>
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
