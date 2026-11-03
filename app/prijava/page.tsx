import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

function safeNext(next: string | string[] | undefined) {
  const n = Array.isArray(next) ? next[0] : next;
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export default async function PrijavaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="page">
      <Logo />
      <h1 className="display">Prijava</h1>
      <p className="muted" style={{ margin: 0 }}>
        Upiši email. Poslaćemo ti kod za prijavu, bez lozinke.
      </p>
      <LoginForm next={safeNext(next)} />
    </main>
  );
}
