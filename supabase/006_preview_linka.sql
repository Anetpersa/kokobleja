-- Kokobleja · korak 4: preview linka u Viberu
-- Pokreni ceo fajl jednom u Supabase: SQL Editor → New query → Run
--
-- Viber pravi preview linka bez prijave, pa ne vidi ništa iz baze (RLS).
-- Ova funkcija svakome ko ima tačan link eventa vraća SAMO naziv, vreme i da li je otkazan.
-- Mesto, opis, organizator i prijave ostaju vidljivi samo članovima.

create or replace function public.event_preview(p_event_id uuid)
returns table (title text, starts_at timestamptz, cancelled boolean)
language sql stable security definer set search_path = public as $$
  select e.title, e.starts_at, e.status = 'cancelled'
  from public.events e
  where e.id = p_event_id;
$$;

revoke execute on function public.event_preview(uuid) from public;
grant execute on function public.event_preview(uuid) to anon, authenticated;
