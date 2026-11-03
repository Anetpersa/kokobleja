-- Kokobleja · korak 1: članovi i pozivni linkovi
-- Pokreni ceo fajl jednom u Supabase: SQL Editor → New query → Run

-- ---------- Tipovi ----------
create type public.member_role as enum ('member', 'admin');
create type public.member_status as enum ('pending', 'active', 'deactivated');

-- ---------- Tabele ----------
create table public.members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text,
  role public.member_role not null default 'member',
  status public.member_status not null default 'pending',
  auth_user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  token text not null unique
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  used_at timestamptz,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);

-- ---------- Pomoćne funkcije ----------
-- security definer: čitaju members tabelu bez obzira na RLS, da RLS pravila ne bi išla u krug
create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.members where auth_user_id = auth.uid() and status = 'active'
$$;

create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where auth_user_id = auth.uid() and status = 'active')
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where auth_user_id = auth.uid() and status = 'active' and role = 'admin'
  )
$$;

-- Admin pravi (novi) pozivni link za člana; stari neiskorišćeni linkovi prestaju da važe
create or replace function public.create_invite(p_member_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_token text;
begin
  if not public.is_admin() then
    raise exception 'Samo admin može da pravi pozivne linkove';
  end if;
  delete from public.invites where member_id = p_member_id and used_at is null;
  insert into public.invites (member_id) values (p_member_id) returning token into v_token;
  return v_token;
end;
$$;

-- Prijavljeni korisnik iskoristi pozivni link i nalog se veže za člana
create or replace function public.claim_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_invite public.invites;
  v_member public.members;
begin
  if auth.uid() is null then
    raise exception 'Nisi prijavljen/a';
  end if;

  select * into v_invite from public.invites
  where token = p_token and used_at is null and expires_at > now();
  if not found then
    raise exception 'Pozivni link nije važeći ili je već iskorišćen';
  end if;

  select * into v_member from public.members where id = v_invite.member_id;
  if v_member.status = 'deactivated' then
    raise exception 'Ovaj član je deaktiviran';
  end if;

  if exists (select 1 from public.members where auth_user_id = auth.uid() and id <> v_member.id) then
    raise exception 'Ovaj nalog je već vezan za drugog člana';
  end if;

  update public.members
    set auth_user_id = auth.uid(), status = 'active'
    where id = v_member.id;
  update public.invites set used_at = now() where id = v_invite.id;

  return v_member.id;
end;
$$;

-- Admin odvezuje nalog (npr. promena emaila); član ide u "čeka prijavu" i dobija novi link
create or replace function public.unlink_member(p_member_id uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Samo admin može da odveže nalog';
  end if;
  if p_member_id = public.current_member_id() then
    raise exception 'Ne možeš da odvežeš svoj nalog';
  end if;
  update public.members set auth_user_id = null, status = 'pending'
    where id = p_member_id and status <> 'deactivated';
  return public.create_invite(p_member_id);
end;
$$;

-- ---------- Row Level Security ----------
alter table public.members enable row level security;
alter table public.invites enable row level security;

create policy "Clanovi vide clanove" on public.members
  for select using (public.is_active_member());

create policy "Admin dodaje clanove" on public.members
  for insert with check (public.is_admin());

create policy "Admin menja clanove" on public.members
  for update using (public.is_admin()) with check (public.is_admin());

create policy "Admin vidi pozivnice" on public.invites
  for select using (public.is_admin());

-- Funkcije koje app poziva
grant execute on function public.create_invite(uuid) to authenticated;
grant execute on function public.claim_invite(text) to authenticated;
grant execute on function public.unlink_member(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_member() to authenticated;
grant execute on function public.current_member_id() to authenticated;
