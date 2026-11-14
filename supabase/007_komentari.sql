-- Kokobleja · korak 5: komentari
-- Pokreni ceo fajl jednom u Supabase: SQL Editor → New query → Run

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.members (id),
  body text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index comments_event_idx on public.comments (event_id, created_at);

alter table public.comments enable row level security;

-- Svi aktivni članovi čitaju komentare
create policy "Clanovi vide komentare" on public.comments
  for select using (public.is_active_member());

-- Član piše samo u svoje ime, i samo na event koji nije otkazan
create policy "Clanovi pisu komentare" on public.comments
  for insert with check (
    public.is_active_member()
    and member_id = public.current_member_id()
    and exists (select 1 from public.events e where e.id = event_id and e.status = 'active')
  );

-- Autor briše svoj komentar, admin bilo koji. Izmena komentara ne postoji.
create policy "Autor ili admin brise komentar" on public.comments
  for delete using (member_id = public.current_member_id() or public.is_admin());

-- Realtime: novi komentari se pojavljuju bez osvežavanja stranice (RLS važi i ovde)
alter publication supabase_realtime add table public.comments;
