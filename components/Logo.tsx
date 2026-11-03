import Link from "next/link";

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <path d="M17 3c6.5 0 11.5 9 11.5 16.5a11.5 11.5 0 0 1-23 0C5.5 12 10.5 3 17 3z" fill="#EA580C" />
      <circle cx="20.5" cy="15" r="1.9" fill="#2B1B12" />
      <path d="M26.5 17.5l4.5 1.6-4.5 1.6z" fill="#F59E0B" />
      <path d="M13 5.5c0-2 2-3 3-1.5c1-1.5 3.2-0.8 3 1.2" stroke="#B91C1C" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="logo">
      <LogoMark />
      <span>Kokobleja</span>
    </Link>
  );
}
