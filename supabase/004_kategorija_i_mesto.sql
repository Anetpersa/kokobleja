-- Kokobleja · sređivanje: kategorija eventa i "mesto još nije određeno"
-- Pokreni jednom u Supabase: SQL Editor → New query → Run

-- Mesto sme da bude prazno (= još nije određeno)
alter table public.events alter column location drop not null;

-- Kategorija eventa (opciono)
alter table public.events add column category text
  check (category is null or category in ('board_game', 'bioskop', 'svirka', 'izlazak', 'proslava', 'ostalo'));
