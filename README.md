# Styl

A private wardrobe app: photograph your clothes, Styl reads them, and suggests outfits every day from your own pieces, your taste and the weather.

Built for a handful of people, on free tiers only.

## Run it

```bash
pnpm install
pnpm dev -p 3100 -H 0.0.0.0     # laptop: http://localhost:3100
                                # phone on same Wi-Fi: http://<laptop-ip>:3100
pnpm test                       # outfit engine + photo analysis tests
```

With no `.env.local`, Styl runs in **demo mode**: everything is saved in that browser only. Good for trying it, not for real use.

## What runs where (all free)

| Part | Service | Free limit (plenty for 2–5 people) |
|---|---|---|
| App hosting | Vercel Hobby | personal use |
| Login, database, photo storage | Supabase Free | 500 MB database, 1 GB photos (~5,000 photos) |
| Photo check + auto-fill | Groq (main, fast) + Google Gemini (backup) | daily free quota; Google may use free-tier inputs to improve its models |
| Weather | Open-Meteo | no key needed |
| Outfit suggestions | Styl's own rules (`src/lib/suggest.ts`) | runs in the browser, no cost |

## Go live: step by step

### 1. Supabase (login + database + photos)
1. supabase.com → New project (any name, pick region **Mumbai**).
2. **SQL Editor** → New query → paste all of `supabase/schema.sql` → **Run**.
3. **Authentication → Sign In / Providers → Email**: turn **off** "Confirm email" (so friends can sign in straight away).
4. **Project Settings → API**: copy the **Project URL** and the **anon / publishable key**.
5. After your friends have signed up, you can turn off new sign-ups (**Authentication → Settings → Allow new users to sign up**) so strangers can't join.

> Free Supabase projects pause after 7 days with no activity. Open the app once a week, or click "Restore" in the Supabase dashboard if it pauses.

### 2. Gemini key (photo check + auto-fill)
1. aistudio.google.com → **Get API key** → Create key. No billing needed.
2. This is what blocks non-clothing photos (posters, screenshots) and fills in name, category, colours, pattern, dressiness, season and style automatically.

### 2b. Groq key (main photo check, fast)
1. console.groq.com/keys → Create API key. Free, no card.
2. Add it as `GROQ_API_KEY` (in `.env.local` and in Vercel).

### 3. Local test with real keys
Copy `.env.example` to `.env.local`, fill in the three values, restart `pnpm dev`.

### 4. GitHub
```bash
git add -A && git commit -m "feat: Styl v1"
git remote add origin https://github.com/<you>/styl.git
git push -u origin main
```

### 5. Vercel
1. vercel.com → **Add New → Project** → import the GitHub repo.
2. **Environment Variables**: add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.
3. **Deploy**. Share the `*.vercel.app` link with friends.
4. On a phone: open the link → Share → **Add to Home Screen**. It opens full-screen like an app.

## Where things are
- `docs/PLAN.md`: product plan and status
- `src/lib/suggest.ts`: outfit engine (scoring rules, all commented)
- `src/app/api/analyse/route.ts`: Gemini photo check
- `src/lib/backend/`: Supabase (`cloud.ts`) and demo mode (`local.ts`)
- `supabase/schema.sql`: tables, row-level security, private photo bucket
- `public/styles/`: onboarding style photos (Unsplash, see `CREDITS.md`)
