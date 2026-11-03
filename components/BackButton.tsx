import Link from "next/link";

export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="icon-btn" aria-label={label}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  );
}
