-- Kokobleja · prvi admin (pokreni JEDNOM, posle 001_clanovi.sql)
-- Promeni ime i prezime ako treba. Rezultat je token za tvoj pozivni link:
--   https://<tvoja-adresa>.vercel.app/pozivnica/<token>

with novi as (
  insert into public.members (first_name, last_name, role)
  values ('Ana', null, 'admin')
  returning id
)
insert into public.invites (member_id)
select id from novi
returning token;
