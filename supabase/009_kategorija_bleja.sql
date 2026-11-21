-- Kokobleja · nova kategorija eventa: "Bleja"
-- Pokreni jednom u Supabase: SQL Editor → New query → Run

-- Ukloni staro pravilo o dozvoljenim kategorijama (bez obzira kako se zove)
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.events'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%category%'
  loop
    execute format('alter table public.events drop constraint %I', c.conname);
  end loop;
end $$;

-- Novo pravilo: iste kategorije + "bleja"
alter table public.events add constraint events_category_check
  check (category is null or category in ('board_game', 'bioskop', 'svirka', 'izlazak', 'proslava', 'bleja', 'ostalo'));
