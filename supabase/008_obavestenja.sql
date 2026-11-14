-- Kokobleja · korak 6b: push obaveštenja
-- Pokreni ceo fajl jednom u Supabase: SQL Editor → New query → Run
--
-- Kako radi:
-- 1. Svaki uređaj na kome član uključi obaveštenja upisuje se u push_subscriptions.
-- 2. Kad se nešto desi (novi event, otkazivanje, izmena, mesto sa liste čekanja, komentar,
--    podsetnik), baza sama upiše poruke u push_outbox (trigeri ispod), samo za aktivne
--    članove koji imaju uključena obaveštenja.
-- 3. Aplikacija odmah posle akcije preuzme poruke iz push_outbox i pošalje ih (lib/push.ts).

-- ---------- Uređaji sa uključenim obaveštenjima ----------
create table public.push_subscriptions (
  endpoint text primary key,
  member_id uuid not null references public.members (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_member_idx on public.push_subscriptions (member_id);

alter table public.push_subscriptions enable row level security;

-- Član vidi samo svoje uređaje; upis i brisanje idu preko funkcija ispod
create policy "Clan vidi svoje uredjaje" on public.push_subscriptions
  for select using (member_id = public.current_member_id());

-- Uključi obaveštenja na ovom uređaju (ako je uređaj ranije bio nečiji drugi, prelazi na mene)
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.current_member_id();
begin
  if v_me is null then
    raise exception 'Nisi aktivan član';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000 then
    raise exception 'Neispravan uređaj';
  end if;
  insert into public.push_subscriptions (endpoint, member_id, p256dh, auth)
    values (p_endpoint, v_me, p_p256dh, p_auth)
    on conflict (endpoint) do update
      set member_id = excluded.member_id, p256dh = excluded.p256dh, auth = excluded.auth, updated_at = now();
end;
$$;

-- Isključi obaveštenja na ovom uređaju
create or replace function public.remove_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subscriptions
    where endpoint = p_endpoint and member_id = public.current_member_id()
$$;

-- ---------- Red poruka za slanje ----------
create table public.push_outbox (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.members (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  kind text not null check (kind in ('new_event', 'cancelled', 'restored', 'changed', 'promoted', 'comment', 'reminder')),
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Niko iz aplikacije ne čita ovu tabelu direktno (nema pravila = nema pristupa);
-- čita je samo server sa tajnim ključem
alter table public.push_outbox enable row level security;

-- Upiši poruku za ove članove (samo aktivni, i samo oni koji imaju uključena obaveštenja)
create or replace function public.queue_push(p_kind text, p_event_id uuid, p_member_ids uuid[], p_data jsonb default '{}')
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  insert into public.push_outbox (member_id, event_id, kind, data)
    select m.id, p_event_id, p_kind, coalesce(p_data, '{}')
    from public.members m
    where m.id = any (p_member_ids)
      and m.status = 'active'
      and exists (select 1 from public.push_subscriptions s where s.member_id = m.id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Server preuzima poruke za slanje (svaku tačno jednom, i kad dva slanja krenu u isto vreme)
create or replace function public.claim_push_outbox(p_limit integer default 300)
returns setof public.push_outbox language sql security definer set search_path = public as $$
  delete from public.push_outbox
    where id in (select id from public.push_outbox order by id limit p_limit for update skip locked)
    returning *
$$;

-- ---------- Lista čekanja: sada šalje i obaveštenje „Oslobodilo se mesto” ----------
create or replace function public.promote_waitlist(p_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_max integer;
  v_going integer;
  v_next uuid;
begin
  select max_spots into v_max from public.events where id = p_event_id;

  loop
    select count(*) into v_going from public.rsvps where event_id = p_event_id and status = 'going';
    exit when v_max is not null and v_going >= v_max;

    select member_id into v_next from public.rsvps
      where event_id = p_event_id and status = 'waitlist'
      order by created_at
      limit 1;
    exit when v_next is null;

    update public.rsvps set status = 'going'
      where event_id = p_event_id and member_id = v_next;
    perform public.queue_push('promoted', p_event_id, array[v_next]);
  end loop;
end;
$$;

-- ---------- Eventi: novi, otkazan, vraćen, promenjeno vreme ili mesto ----------
create or replace function public.on_event_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.current_member_id(); -- ko je napravio izmenu (on ne dobija obaveštenje)
  v_people uuid[];
begin
  if tg_op = 'INSERT' then
    select array_agg(id) into v_people from public.members
      where status = 'active' and id <> new.organizer_id;
    perform public.queue_push('new_event', new.id, v_people);
    return new;
  end if;

  -- Svi prijavljeni: Dolazim, Možda i lista čekanja
  select array_agg(member_id) into v_people from public.rsvps
    where event_id = new.id and member_id is distinct from v_me;

  if old.status = 'active' and new.status = 'cancelled' then
    perform public.queue_push('cancelled', new.id, v_people);
  elsif old.status = 'cancelled' and new.status = 'active' then
    perform public.queue_push('restored', new.id, v_people);
  elsif new.status = 'active'
    and (new.starts_at is distinct from old.starts_at or new.location is distinct from old.location) then
    perform public.queue_push('changed', new.id, v_people, jsonb_build_object(
      'time', new.starts_at is distinct from old.starts_at,
      'place', new.location is distinct from old.location
    ));
  end if;
  return new;
end;
$$;

create trigger events_push_insert after insert on public.events
  for each row execute function public.on_event_push();

create trigger events_push_update after update of status, starts_at, location on public.events
  for each row execute function public.on_event_push();

-- ---------- Komentari: javi prijavljenima i organizatoru ----------
create or replace function public.on_comment_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_people uuid[];
begin
  select array_agg(distinct x) into v_people from (
    select member_id as x from public.rsvps where event_id = new.event_id
    union
    select organizer_id from public.events where id = new.event_id
  ) t
  where x <> new.member_id;

  perform public.queue_push('comment', new.event_id, v_people, jsonb_build_object(
    'author', (select first_name from public.members where id = new.member_id),
    'body', left(new.body, 160)
  ));
  return new;
end;
$$;

create trigger comments_push after insert on public.comments
  for each row execute function public.on_comment_push();

-- ---------- Podsetnik („Podseti ekipu”) ----------
-- audience: 'signed' = Dolazim i Možda; 'unsigned' = oni koji se još nisu prijavili
create table public.event_reminders (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events (id) on delete cascade,
  audience text not null check (audience in ('signed', 'unsigned')),
  sent_by uuid references public.members (id) on delete set null,
  message text,
  recipients integer not null default 0,
  sent_at timestamptz not null default now()
);

create index event_reminders_event_idx on public.event_reminders (event_id, audience, sent_at desc);

alter table public.event_reminders enable row level security;

create policy "Clanovi vide podsetnike" on public.event_reminders
  for select using (public.is_active_member());

-- Vraća koliko ljudi je dobilo obaveštenje
create or replace function public.remind_event(p_event_id uuid, p_audience text, p_message text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.current_member_id();
  v_event public.events;
  v_msg text := nullif(trim(coalesce(p_message, '')), '');
  v_last timestamptz;
  v_people uuid[];
  v_count integer;
begin
  if v_me is null then
    raise exception 'Nisi aktivan član';
  end if;
  if p_audience not in ('signed', 'unsigned') then
    raise exception 'Izaberi kome šalješ podsetnik';
  end if;
  if length(v_msg) > 200 then
    raise exception 'Poruka može da ima najviše 200 znakova';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Event ne postoji';
  end if;
  if v_event.organizer_id <> v_me and not public.is_admin() then
    raise exception 'Podsetnik šalje organizator ili admin';
  end if;
  if v_event.status = 'cancelled' then
    raise exception 'Event je otkazan';
  end if;
  if v_event.starts_at < now() then
    raise exception 'Event je već počeo';
  end if;

  select max(sent_at) into v_last from public.event_reminders
    where event_id = p_event_id and audience = p_audience;
  if v_last > now() - interval '3 hours' then
    raise exception 'Ovaj podsetnik je već poslat u %. Sledeći može 3 sata posle toga.',
      to_char(v_last at time zone 'Europe/Belgrade', 'HH24:MI');
  end if;

  if p_audience = 'signed' then
    select array_agg(member_id) into v_people from public.rsvps
      where event_id = p_event_id and status in ('going', 'maybe') and member_id <> v_me;
  else
    select array_agg(m.id) into v_people from public.members m
      where m.status = 'active' and m.id <> v_me
        and not exists (select 1 from public.rsvps r where r.event_id = p_event_id and r.member_id = m.id);
  end if;

  v_count := public.queue_push('reminder', p_event_id, v_people, jsonb_build_object(
    'audience', p_audience,
    'message', v_msg,
    'from', (select first_name from public.members where id = v_me)
  ));

  insert into public.event_reminders (event_id, audience, sent_by, message, recipients)
    values (p_event_id, p_audience, v_me, v_msg, v_count);
  return v_count;
end;
$$;

-- Za ekran „Podseti ekipu”: koliko ljudi je u svakoj grupi i koliko njih ima uključena obaveštenja
create or replace function public.reminder_audience(p_event_id uuid)
returns table (signed_total integer, signed_push integer, unsigned_total integer, unsigned_push integer)
language sql stable security definer set search_path = public as $$
  with me as (select public.current_member_id() as id),
  people as (
    select m.id,
      exists (select 1 from public.rsvps r where r.event_id = p_event_id and r.member_id = m.id and r.status in ('going', 'maybe')) as signed,
      not exists (select 1 from public.rsvps r where r.event_id = p_event_id and r.member_id = m.id) as unsigned,
      exists (select 1 from public.push_subscriptions s where s.member_id = m.id) as has_push
    from public.members m, me
    where m.status = 'active' and m.id <> me.id and me.id is not null
  )
  select
    count(*) filter (where signed)::integer,
    count(*) filter (where signed and has_push)::integer,
    count(*) filter (where unsigned)::integer,
    count(*) filter (where unsigned and has_push)::integer
  from people
$$;

-- ---------- Ko sme šta da pozove ----------
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.remove_push_subscription(text) to authenticated;
grant execute on function public.remind_event(uuid, text, text) to authenticated;
grant execute on function public.reminder_audience(uuid) to authenticated;

revoke execute on function public.queue_push(text, uuid, uuid[], jsonb) from public, anon, authenticated;
revoke execute on function public.claim_push_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_push_outbox(integer) to service_role;
revoke execute on function public.promote_waitlist(uuid) from public, anon, authenticated;
revoke execute on function public.on_event_push() from public, anon, authenticated;
revoke execute on function public.on_comment_push() from public, anon, authenticated;
