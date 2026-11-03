import Link from "next/link";

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function BottomNav({ active, isAdmin }: { active: "eventi" | "clanovi" | "profil"; isAdmin: boolean }) {
  const cls = (k: string) => `nav-item${active === k ? " nav-active" : ""}`;
  return (
    <nav className="bottom-nav" aria-label="Glavni meni">
      <Link href="/" className={cls("eventi")}>
        <CalendarIcon />
        Eventi
      </Link>
      {isAdmin && (
        <Link href="/clanovi" className={cls("clanovi")}>
          <PeopleIcon />
          Članovi
        </Link>
      )}
      <Link href="/profil" className={cls("profil")}>
        <PersonIcon />
        Profil
      </Link>
    </nav>
  );
}
