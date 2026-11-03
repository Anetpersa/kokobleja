# Kokobleja

Privatna web aplikacija za evente naše ekipe. Next.js na Vercelu + Supabase.

**Korak 1 (ovaj kod):** prijava kodom na email, pozivni linkovi, admin ekran za članove, deaktivacija, ekran „Privatna grupa”.

---

## Postavljanje (jednom)

### 1. Supabase baza

1. Supabase → tvoj projekat → **SQL Editor → New query**.
2. Nalepi ceo sadržaj fajla `supabase/001_clanovi.sql` i klikni **Run**.

### 2. Kod na GitHub

U terminalu, u ovom folderu:

```bash
git init
git add .
git commit -m "Korak 1: prijava i članovi"
git branch -M main
git remote add origin https://github.com/<tvoj-username>/kokobleja.git
git push -u origin main
```

### 3. Vercel

1. Vercel → **Add New → Project** → izaberi repo `kokobleja` → **Import**.
2. Pod **Environment Variables** dodaj dve promenljive (vrednosti iz Supabase: Project Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Deploy**. Za minut dobijaš adresu, npr. `https://kokobleja.vercel.app`.

### 4. Supabase podešavanja za prijavu

1. **Authentication → URL Configuration**
   - Site URL: tvoja Vercel adresa
   - Redirect URLs: dodaj `https://<tvoja-adresa>.vercel.app/**`
2. **Authentication → Emails → Magic Link** šablon: dodaj kod u mejl, npr. ovu liniju iznad linka:

   ```html
   <p>Tvoj kod za Kokobleju: <strong>{{ .Token }}</strong></p>
   ```

   Kod je bitan jer se link iz mejla često otvori u drugom browseru (ili van instalirane aplikacije na iPhone-u), a kod radi svuda.

### 5. Prvi admin (ti)

1. U SQL Editoru pokreni `supabase/002_prvi_admin.sql` (promeni ime ako treba).
2. Rezultat je jedan **token**. Otvori: `https://<tvoja-adresa>.vercel.app/pozivnica/<token>`
3. Prijavi se emailom, unesi kod, klikni **Prihvati poziv**. Sad si admin.

---

## Kako se dodaju članovi

1. Početna → **Upravljaj članovima** → upiši ime i prezime → **Dodaj i napravi pozivni link**.
2. Klikni **Pozivni link**: na telefonu se otvara meni za deljenje (izaberi Viber i pošalji osobi privatno), na računaru se link kopira.
3. Osoba otvori link, prijavi se emailom i prihvati poziv. Link posle toga više ne važi.

## Lokalno pokretanje (opciono)

```bash
cp .env.local.example .env.local   # pa upiši svoje vrednosti
npm install
npm run dev
```

## Poznata ograničenja

- Ugrađeni Supabase servis za mejlove ima mali limit poruka po satu. Za prvih par ljudi je dovoljno; pre nego što pozoveš celu grupu, povezaćemo besplatan SMTP servis (npr. Resend).
- Prijava preko Google naloga dolazi kasnije (traži podešavanje u Google Cloud-u).
