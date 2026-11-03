-- Kokobleja · korak 2: eventi
-- Pokreni ceo fajl jednom u Supabase: SQL Editor → New query → Run

create type public.event_status as enum ('active', 'cancelled');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text,
  starts_at timestamptz not null,
  location text not null check (length(trim(location)) > 0),
  max_spots integer check (max_spots is null or max_spots > 0),
  organizer_id uuid not null references public.members (id),
  status public.event_status not null default 'active',
  cancel_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_starts_at_idx on public.events (starts_at);

-- updated_at se sam osvežava pri svakoj izmeni
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

alter table public.events enable row level security;

-- Svi aktivni članovi vide sve evente
create policy "Clanovi vide evente" on public.events
  for select using (public.is_active_member());

-- Svaki član pravi event, i to samo kao organizator sam sebi
create policy "Clanovi prave evente" on public.events
  for insert with check (
    public.is_active_member() and organizer_id = public.current_member_id()
  );

-- Menja organizator ili admin
create policy "Organizator ili admin menja event" on public.events
  for update
  using (organizer_id = public.current_member_id() or public.is_admin())
  with check (organizer_id = public.current_member_id() or public.is_admin());

-- Briše organizator ili admin (u koraku 3: organizator samo dok nema prijava)
create policy "Organizator ili admin brise event" on public.events
  for delete using (organizer_id = public.current_member_id() or public.is_admin());
