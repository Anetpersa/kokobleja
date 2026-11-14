import Link from "next/link";

// Glava koke iz ikonice aplikacije (public/koka.png)
export function LogoMark({ size = 36 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/koka.png" width={size} height={size} alt="" aria-hidden="true" style={{ display: "block", borderRadius: "50%" }} />;
}

export function Logo() {
  return (
    <Link href="/" className="logo">
      <LogoMark size={40} />
      <span>Kokobleja</span>
    </Link>
  );
}
