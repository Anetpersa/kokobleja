-- Kokobleja · korak 3: prijave, limit mesta i lista čekanja
-- Pokreni ceo fajl jednom u Supabase: SQL Editor → New query → Run

create type public.rsvp_status as enum ('going', 'maybe', 'waitlist');

create table public.rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  status public.rsvp_status not null,
  created_at timestamptz not null default now(), -- red na listi čekanja
  primary key (event_id, member_id)
);

create index rsvps_member_idx on public.rsvps (member_id);

alter table public.rsvps enable row level security;

-- Svi aktivni članovi vide ko dolazi; menja se ISKLJUČIVO preko funkcija ispod,
-- da dvoje ljudi ne bi zauzeli poslednje mesto u istoj sekundi
create policy "Clanovi vide prijave" on public.rsvps
  for select using (public.is_active_member());

-- ---------- Lista čekanja: popuni slobodna mesta redom ----------
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
    -- Korak 6: push obaveštenje "Upao/la si sa liste čekanja"
  end loop;
end;
$$;

-- ---------- Prijava: Dolazim ili Možda ----------
-- Vraća stvarni status (Dolazim može da postane lista čekanja ako je popunjeno)
create or replace function public.set_rsvp(p_event_id uuid, p_status text)
returns public.rsvp_status language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.current_member_id();
  v_event public.events;
  v_current public.rsvp_status;
  v_going integer;
  v_new public.rsvp_status;
begin
  if v_me is null then
    raise exception 'Nisi aktivan član';
  end if;
  if p_status not in ('going', 'maybe') then
    raise exception 'Nepoznat odgovor';
  end if;

  -- Zaključaj event dok računamo mesta
  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Event ne postoji';
  end if;
  if v_event.status = 'cancelled' then
    raise exception 'Event je otkazan';
  end if;
  if v_event.starts_at < now() - interval '12 hours' then
    raise exception 'Event je već prošao';
  end if;

  select status into v_current from public.rsvps where event_id = p_event_id and member_id = v_me;

  if p_status = 'maybe' then
    v_new := 'maybe';
  elsif v_current in ('going', 'waitlist') then
    return v_current; -- već dolazi ili već čeka, red se ne menja
  else
    select count(*) into v_going from public.rsvps where event_id = p_event_id and status = 'going';
    v_new := case when v_event.max_spots is null or v_going < v_event.max_spots then 'going' else 'waitlist' end;
  end if;

  insert into public.rsvps (event_id, member_id, status, created_at)
    values (p_event_id, v_me, v_new, now())
    on conflict (event_id, member_id) do update
      set status = excluded.status, created_at = excluded.created_at;

  -- Ako je prešao iz Dolazim u Možda, oslobodio je mesto
  if v_current = 'going' and v_new <> 'going' then
    perform public.promote_waitlist(p_event_id);
  end if;

  return v_new;
end;
$$;

-- ---------- Odjava ----------
create or replace function public.cancel_rsvp(p_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.current_member_id();
begin
  if v_me is null then
    raise exception 'Nisi aktivan član';
  end if;
  perform 1 from public.events where id = p_event_id for update;
  delete from public.rsvps where event_id = p_event_id and member_id = v_me;
  perform public.promote_waitlist(p_event_id);
end;
$$;

-- ---------- Organizator poveća broj mesta → lista čekanja se pomera ----------
create or replace function public.on_event_spots_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.promote_waitlist(new.id);
  return new;
end;
$$;

create trigger events_spots_changed after update of max_spots on public.events
  for each row when (new.max_spots is distinct from old.max_spots)
  execute function public.on_event_spots_changed();

-- ---------- Deaktiviran član: brišu se njegove prijave na buduće evente ----------
create or replace function public.on_member_deactivated()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_event uuid;
begin
  for v_event in
    delete from public.rsvps r
      using public.events e
      where r.event_id = e.id and r.member_id = new.id and e.starts_at > now()
      returning r.event_id
  loop
    perform public.promote_waitlist(v_event);
  end loop;
  return new;
end;
$$;

create trigger members_deactivated after update of status on public.members
  for each row when (new.status = 'deactivated' and old.status <> 'deactivated')
  execute function public.on_member_deactivated();

-- ---------- Brisanje eventa: organizator samo dok se niko drugi nije prijavio ----------
drop policy "Organizator ili admin brise event" on public.events;

create or replace function public.event_has_other_rsvps(p_event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.rsvps r join public.events e on e.id = r.event_id
    where r.event_id = p_event_id and r.member_id <> e.organizer_id
  )
$$;

create policy "Organizator (bez prijava) ili admin brise event" on public.events
  for delete using (
    public.is_admin()
    or (organizer_id = public.current_member_id() and not public.event_has_other_rsvps(id))
  );

grant execute on function public.set_rsvp(uuid, text) to authenticated;
grant execute on function public.cancel_rsvp(uuid) to authenticated;
grant execute on function public.event_has_other_rsvps(uuid) to authenticated;
revoke execute on function public.promote_waitlist(uuid) from public, anon, authenticated;
