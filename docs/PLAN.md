# Styl: product plan

Working name: **Styl**. A private, luxury digital wardrobe. Name can change later.

Status log is at the bottom. Update it as phases finish.

---

## Phase 1: Product understanding

### Vision and positioning
Your wardrobe, photographed like a boutique. Styl turns phone photos of clothes into studio product images and keeps them organised, searchable and ready to style.

Positioning: a personal luxury tool, not a social network and not a shop. Private by default.

### Personas
| Persona | Who | Job to be done |
|---|---|---|
| **Aanya, 31, the curator** | Owns many good pieces, forgets half of them | "Show me everything I own, beautifully, so I actually wear it." |
| **Rohan, 27, the planner** | Travels for work, plans outfits ahead | "Build outfits for a trip without emptying the cupboard." |
| **Meera, 45, the collector** | Watches, bags, heritage pieces | "Keep a clean record of valuable items with details." |

### Problems we solve
1. People forget what they own, so they rebuy or never wear things.
2. Phone photos of clothes look messy, so a wardrobe catalogue feels unusable.
3. Organising by hand (category, colour, season) is tedious.
4. Planning outfits means physically pulling clothes out.

### Core features (MVP)
1. Add item: camera or photo library.
2. AI studio image: background removed, soft light-grey studio backdrop, original kept.
3. Review: compare original and studio image, accept, retry or keep original.
4. Details: category, colour, brand, season, notes. AI suggests, the user confirms.
5. Wardrobe grid with search, filters (category, colour, season) and sort.
6. Favourites.
7. Item detail view with full-screen image.
8. Collections (manual groups such as "Goa trip", "Office").
9. Simple outfit builder (pick items into slots, save).
10. Profile and settings.

### Later (not MVP)
- Wear tracking and cost-per-wear
- Weather-aware outfit suggestions
- Calendar of outfits
- Auto-duplicate detection by image similarity
- Sharing a collection by private link
- Native app wrappers

### Primary journey
Open app → tap **Add** → take or choose photo → upload starts → AI processing (non-blocking) → review original vs studio → confirm suggested details → save → item appears in wardrobe and in "Recently added".

### Information architecture
```
Home (dashboard)
  ├─ Recently added
  ├─ Collections preview
  └─ Processing items
Wardrobe
  ├─ Grid (search, filter, sort)
  └─ Item detail → edit, favourite, add to collection, use in outfit
Add (+)  ← modal flow, not a tab destination
  └─ Source → Upload → Processing → Review → Details → Saved
Outfits
  ├─ Saved outfits
  └─ Builder
Profile
  ├─ Favourites
  ├─ Collections
  └─ Settings
```

### Navigation
- **Mobile:** bottom bar with Home · Wardrobe · **Add** (centre, raised) · Outfits · Profile. Add opens a bottom sheet (Camera / Library).
- **Desktop:** left rail with the same five items; Add becomes a primary button at the top of the rail.
- Back always returns to the previous screen; the Add flow can be closed at any step with a confirm only if work would be lost.

### UX risks and answers
| Risk | Answer |
|---|---|
| AI takes 10 to 60 s | Processing runs in the background. The user can leave; a status chip and toast tell them when it is ready. |
| AI changes the item (colour, logo) | Always show original side by side; "Keep original" is one tap; copy never promises a perfect match. |
| Generation fails | Clear error, Retry, or save with the original photo. Nothing is lost. |
| Duplicate uploads | Same file hash → "You already added this" with a link to the item. |
| Unsupported file / too large | Accept JPEG, PNG, WebP, HEIC. Reject others before upload with a plain message. Resize on device before upload. |
| Tedious tagging | AI suggests category and colour; user only confirms. |
| Privacy | Images are private; served through signed URLs only. |

---

## Phase 2: Stack and architecture

### Frontend: Next.js (App Router) + TypeScript
Chosen over Vite + React because:
- Auth, uploads and AI calls need server code; Next.js route handlers and server actions keep that in one project.
- `next/image` gives responsive, lazy, cached images, which matters most in an image-heavy grid.
- SEO only matters for the marketing/welcome pages; SSR covers those, the app itself is client-heavy either way.
- One deploy (Vercel or Amplify) instead of a SPA plus a separate API.

Vite would be a fine choice for a pure SPA, but we would then need a second backend project.

### Backend
| Concern | Choice | Why |
|---|---|---|
| Database | PostgreSQL | Relational data (users, items, collections, outfits), reliable, cheap to host (Neon / Supabase / RDS). |
| ORM | Prisma | Typed queries, migrations. |
| Auth | Auth.js (email magic link + Google) | No passwords to store. |
| Image storage | S3-compatible bucket (AWS S3 or Cloudflare R2), **private** | Signed upload and signed read URLs; images never public. |
| Image processing | `sharp` on the server: resize, strip EXIF/GPS, convert to WebP | Smaller files, no location leak. |
| AI image | OpenAI image edit API (key added later) behind one `generateStudioImage()` function | One place to swap model or provider. |
| Background jobs | DB job table + worker (or Inngest / QStash when hosted) | AI calls are slow; never run inside the request. |
| Rate limiting | Per-user limit on AI generations (e.g. 30/day) | Cost control. |

### Data model (first cut)
```
User(id, email, name, createdAt)
Item(id, userId, name, category, colour, brand, season, notes,
     originalKey, studioKey?, useStudio, status: processing|ready|failed,
     fileHash, isFavourite, createdAt)
Collection(id, userId, name)
CollectionItem(collectionId, itemId)
Outfit(id, userId, name)
OutfitItem(outfitId, itemId, slot)
Job(id, itemId, kind, status, attempts, error, createdAt)
```

### Image flow
1. Client resizes the photo (max 2048 px), computes a hash, asks server for a signed upload URL.
2. Client uploads straight to storage; server creates `Item(status=processing)` and a `Job`.
3. Worker downloads, cleans with `sharp`, calls AI, stores `studioKey`, sets `status=ready` (or `failed`).
4. Client polls the item (or gets a server event) and shows the review screen.

### Build order
Until the OpenAI key arrives, `generateStudioImage()` is a **mock** that returns the original image after a delay. Mocked parts are labelled in code with `MOCK:`.

---

## Phase 3: Design system
Tokens and components live in code, not in this doc:
- Tokens: `src/app/globals.css`
- Components: `src/components/ui/`
- Live reference: `/design-system` page

---

## What we need from you for OpenAI (later)
See README "Going live with AI".

---

## Status log
- [x] Phase 1 plan, Phase 2 architecture, Phase 3 design system
- [x] Changed after owner feedback (2026-11-14): free tiers only, no AI image generation. Users upload clear photos; Gemini checks and describes them. Fonts: Poppins + Inter.
- [x] Screens: splash, welcome, sign in, onboarding (name, gender, styles with photos, occasions, colours, weather), home, wardrobe, add flow, item detail, outfits (for you / saved / build), profile with "More about you"
- [x] Backend: Supabase (auth, Postgres with RLS, private storage) + demo mode
- [x] Outfit engine with tests
- [ ] Owner: create Supabase project + Gemini key, deploy to Vercel (README)

Later, if wanted: duplicate photo detection, collections, wear calendar, offline support (service worker), fit/body-shape questions once items record fit.
