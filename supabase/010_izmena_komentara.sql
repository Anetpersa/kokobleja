-- Kokobleja · komentari: izmena svog komentara i komentarišu samo prijavljeni
-- Pokreni ceo fajl jednom u Supabase: SQL Editor → New query → Run

-- Kad je komentar izmenjen (null = nikad nije menjan)
alter table public.comments add column edited_at timestamptz;

-- ---------- Ko sme da piše komentar ----------
-- Samo onaj ko je na eventu kliknuo Dolazim ili Možda (lista čekanja se računa kao Dolazim).
-- Organizator automatski dobija Dolazim kad napravi event.
drop policy "Clanovi pisu komentare" on public.comments;

create policy "Prijavljeni pisu komentare" on public.comments
  for insert with check (
    public.is_active_member()
    and member_id = public.current_member_id()
    and exists (select 1 from public.events e where e.id = event_id and e.status = 'active')
    and exists (
      select 1 from public.rsvps r
      where r.event_id = comments.event_id and r.member_id = public.current_member_id()
    )
  );

-- ---------- Izmena komentara: samo autor, samo dok event nije otkazan ----------
-- Ide preko funkcije, da može da se promeni samo tekst (ne autor, event ni vreme)
create or replace function public.edit_comment(p_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.current_member_id();
  v_body text := trim(coalesce(p_body, ''));
  v_comment public.comments;
begin
  if v_me is null then
    raise exception 'Nisi aktivan član';
  end if;
  if length(v_body) < 1 or length(v_body) > 1000 then
    raise exception 'Komentar mora da ima od 1 do 1000 znakova';
  end if;

  select * into v_comment from public.comments where id = p_id for update;
  if not found then
    raise exception 'Komentar ne postoji';
  end if;
  if v_comment.member_id <> v_me then
    raise exception 'Možeš da menjaš samo svoj komentar';
  end if;
  if exists (select 1 from public.events where id = v_comment.event_id and status <> 'active') then
    raise exception 'Event je otkazan, komentari su zaključani';
  end if;

  -- Ako tekst nije promenjen, ništa ne radimo (da ne piše „izmenjeno” bez razloga)
  if v_body = v_comment.body then
    return;
  end if;

  update public.comments set body = v_body, edited_at = now() where id = p_id;
end;
$$;

revoke execute on function public.edit_comment(uuid, text) from public, anon;
grant execute on function public.edit_comment(uuid, text) to authenticated;
