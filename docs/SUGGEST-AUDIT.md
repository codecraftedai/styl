# Outfit engine audit (`src/lib/suggest.ts`)

Date: 2026-11-14. Baseline probes: `src/lib/__audit__/baseline.test.ts` (run `pnpm vitest run src/lib/__audit__`).
Fixtures: `src/lib/__audit__/fixtures.ts` (hand-built cases + a deterministic generated wardrobe of 50–1000 items).

## 1. How the current engine works

| Function | Role | Keep? |
|---|---|---|
| `targetFormality(occasion, prefs)` | Occasion → casual/smart/formal; Work follows the user's dress code | Keep |
| `weatherOf(tempC, climate, tempFeel)` | Temperature (live or climate default) shifted by "feel" → hot / mild / cold | Keep (3 buckets are enough for the item data we have) |
| `itemScore(item, ctx, weather)` | Additive rules per item: formality gap, season, styles, colours, undertone, prints, recency, favourite | Keep; small date fix |
| `harmony(items, boldness)` | Accent-colour count + hue distance, print count, formality spread | Keep; widen colour input |
| `rng(seed)` | LCG for repeatable shuffle | Keep |
| `suggest(all, ctx, n)` | Score items → top 8 tops × top 8 bottoms + top 8 one-pieces → greedily add shoes, outer, bag/accessory → **sum** of item scores + harmony → sort → drop outfits whose first item was already used | **Rework** ranking, diversity, constraints |
| `missingForSuggestions(items)` | Tells the user what to add first | Keep |

**Well designed, retain:** pure function (easy to test, runs on device, no cost); explicit readable rules; fixed colour palette with hue data; `must` filtering at the end; reasons generated from the same rules that scored the outfit; speed (5.8 ms for 1000 items).

## 2. Confirmed defects and opportunities

### D1. Outfit size inflates score (confirmed, P0)
**Problem:** outfits are compared by the *sum* of item scores.
**Existing behavior:** `score = sum(items) + harmony`. Measured: black dress + loafers 8.45 vs black shirt + trousers + loafers 11.57 with identical item quality.
**Proposed solution:** `fit = mean(item scores of worn pieces)`; add explicit, bounded completeness terms (shoes present, layer when cold); accessories add a small capped bonus.
**User impact:** dresses, sarees, jumpsuits and kurta sets compete fairly. This mostly affects women's and ethnic wardrobes.
**Technical advantage:** scores comparable across 2–5 piece outfits.
**Disadvantage:** completeness weights are hand-set and need tuning.
**Validation:** equal-quality dress vs top+bottom score within 0.5; one-piece can rank #1.

### D2. Diversity only checks the first item (confirmed, P0)
**Problem:** a top can never appear twice; everything else can repeat.
**Existing behavior:** `usedBase` holds `items[0].id`. Measured: 1 top + 5 bottoms → 1 outfit; 10 tops + 2 bottoms → suggestions share 2 of 3 items.
**Proposed solution:** greedy re-ranking (MMR-style): `adjusted = score − λ × itemsShared(with the most similar picked outfit)`, and reject identical item sets.
**User impact:** small wardrobes get several real options; large wardrobes stop showing near-copies.
**Technical advantage:** one rule handles both ends of wardrobe size.
**Disadvantage:** λ is a tuning knob; O(n·k) re-ranking (trivial at these sizes).
**Validation:** 1 top + 5 bottoms → 5 outfits; average shared items in the top 5 drops.

### D3. Shuffle mostly does nothing; jitter scales with outfit size (confirmed, P1)
**Problem:** 0–1.2 random noise per item, summed.
**Existing behavior:** 8 seeds → 2 distinct #1 outfits on a 120-item wardrobe. Home shows only `list[0]`, so Shuffle often changes nothing visible.
**Proposed solution:** seed 1 = pure rules (no noise). Shuffle on Home steps through the already-diverse list; on Outfits a seed adds a single outfit-level noise term.
**User impact:** Shuffle always shows a different, still-good look.
**Technical advantage:** default ranking is fully deterministic and explainable.
**Disadvantage:** none worth noting.
**Validation:** same input + seed → identical output; Home shuffle shows a new outfit each press while options remain.

### D4. Required item depends on a +100 score hack (verified working, P1 refactor)
**Problem:** correctness relies on score inflation, then a post-filter.
**Existing behavior:** works today (test passes for outer); the +100 also leaks into the ranking scores.
**Proposed solution:** hard constraint: when building candidates, the must item's slot accepts only that item.
**User impact:** none visible today; prevents future regressions and wrong rankings among "Style it" results.
**Validation:** must works for every slot (top, bottom, one-piece, shoes, outer, bag, accessory), including against weather and accessory preferences.

### D5. Colour harmony ignores secondary colours (confirmed, P1)
**Existing behavior:** only `colours[0]` counts. Black/red + black/green scored +1 ("clean neutral palette").
**Proposed solution:** count non-neutral colours from all colours of worn pieces; treat `multi` as a print, not as one accent of unknown hue.
**Disadvantage:** slightly more penalties for colourful prints; good for the luxury, restrained target.
**Validation:** the red/green case scores below a clean neutral outfit.

### D6. Greedy accessory: a bag always beats an accessory (confirmed by reading, P1)
**Existing behavior:** `bestAdd(bag) ?? bestAdd(accessory)`.
**Proposed solution:** evaluate the best bag and the best accessory and keep the one with the higher marginal value.
**Validation:** a better-matching watch beats a poor bag.

### D7. Mild-day jacket decided by a coin flip (by reading; low practical impact, P1)
**Proposed solution:** add a layer on mild days only if it raises the outfit score (deterministic).

### D8. Unsafe dates (confirmed, P1)
**Existing behavior:** a future `lastWorn` is treated as "just worn" (−2.5); an invalid date is silently "never worn".
**Proposed solution:** `daysSince` returns "unknown" for invalid or future dates, which applies no penalty.
**Validation:** unit test with future and invalid dates.

### D9. Candidate cap (theoretical, P2)
The top 8 × 8 bases are pruned by individual score, before harmony. Harmony moves scores by at most about 3, so a missed pair is rare. Raise to 12 × 12 (144 bases); the measured cost stays under 10 ms.

### D10. Explanations can be empty or generic (confirmed by reading, P1)
**Proposed solution:** add truthful reasons from data we have: built around your chosen item; uses your favourite colours; includes a favourite piece. A neutral fallback reason only when nothing else is true.

### D11. "I feel the cold" was inverted (confirmed while fixing, P0)
**Problem:** `weatherOf` subtracted the shift, so feeling the cold made the day count as warmer (20° became 24°).
**Why it went unnoticed:** the old mild-day coin flip often added a jacket anyway, so the existing test passed by luck.
**Fix:** add the shift (20° feels like 16° → cold). **Validation:** `D11` test in `suggest.constraints.test.ts`.

### Not a problem (measured)
- **Performance:** 1.1 ms (50 items) to 5.8 ms (1000 items) per call. No optimisation needed.
- **Duplicate items within an outfit:** impossible by construction (one item per slot).

### Not addressable in the engine yet (need data the app doesn't store)
- **Laundry / availability:** items have no availability field. Needs a DB column and a toggle in the UI (P2).
- **Rain, wind, humidity:** items have no material or waterproof data, so the engine can't act on it (P3).
- **Fit and body shape:** no fit data on items (P3).

## 3. Options

| | A: minimal fixes | **B-lite: A + selected rule upgrades (recommended)** | C: adaptive personalisation |
|---|---|---|---|
| Scope | D1, D2, D3, D8 | D1–D8, D10 | B + learn weights from Wear/Save/Skip |
| Quality | Fixes unfairness | + better colour, accessory, explanations | Learns each user's taste over time |
| Effort | ~0.5 day | ~1 day | +2–3 days, plus a feedback store |
| Performance | Same | Same (<10 ms at 1000 items) | Same per call; extra writes |
| Maintenance | Low | Low (still one pure file) | Medium (stored weights, drift, resets) |
| Limitations | Colour and accessory gaps remain | Weights still hand-set | Needs real usage; 2–5 users give too little data to beat good rules |

**Recommendation: B-lite now.** C needs interaction data the product doesn't have yet. With 2–5 users it would mostly learn noise. Revisit after a few weeks of real "Wear this" and Save events.

## 4. Before vs after (targets)

| Dimension | Existing | Proposed | Benefit | Disadvantage |
|---|---|---|---|---|
| Outfit accuracy | Sum favours more pieces | Mean fit + bounded completeness | Fair one-piece vs separates | Completeness weights hand-set |
| Color harmony | Primary colour only | All colours of worn pieces; multi = print | Catches hidden clashes | Slightly stricter on prints |
| Personalization | Static prefs | Static prefs (C deferred) | Predictable, explainable | Doesn't learn yet |
| Weather intelligence | 3 buckets + feel | Same + deterministic layering | No arbitrary jackets | No rain logic (no item data) |
| Diversity | First item unique | Overlap-penalised re-ranking | Real variety, small wardrobes work | λ needs tuning |
| Performance | 5.8 ms at 1000 items | <10 ms target | n/a | Slightly more candidates |
| Scalability | Fine to 1000s | Same | n/a | n/a |
| Maintainability | One pure file | One pure file + audit fixtures | Regression-tested | More tests to maintain |

## 5. Roadmap
- **P0 (now):** D1 fair scoring, D2 diversity.
- **P1 (now):** D3 deterministic default + useful Shuffle, D4 hard `must`, D5 colours, D6 accessory, D7 layering, D8 dates, D10 explanations.
- **P2 (after first real use):** laundry/availability flag (DB + UI), candidate cap 12 × 12, a "Not for me" button to collect explicit feedback.
- **P3 (only with data):** Option C adaptive weights; material/rain rules once items record material.

## 6. Test strategy
- Unit tests per rule (existing 9 + new constraint tests).
- Property checks on generated wardrobes (50–1000 items, several seeds): no duplicate items, valid slot combinations (one-piece never with top/bottom), `must` always present, determinism for a fixed seed.
- Quality scenarios: date-night example, small wardrobe, dress fairness, hidden colour clash, cold layering.
- Performance probe: per-call time at 50/200/500/1000 items, reported separately from quality.

## 7. Results after implementation (same probes, same fixtures)

| Probe | Before | After |
|---|---|---|
| H1 equal dress vs separates | 8.45 vs 11.57 | 5.00 vs 5.00 |
| H2 1 top + 5 bottoms | 1 outfit | 5 outfits |
| H2b items shared between suggestions (of 3) | 2.00 | 1.60 |
| H3 distinct #1 across 8 shuffles | 2 | 6 (default view now has no randomness) |
| H4 black/red + black/green harmony | +1 ("neutral") | −1.5 (clash caught) |
| H5 future/invalid date | future penalised as "just worn" | both ignored |
| H6 22° jacket | always added (coin flip per base) | added only if it improves the outfit |
| H7 1000 items | 5.8 ms | 3.0 ms (slot sort cached) |
| D11 feel-the-cold at 20° | "mild" (wrong) | "cold" |

Tests: 45 passing (`pnpm test`). They cover property checks on generated wardrobes of 0–500 items × 3 seeds (no duplicate items, valid slots, no identical outfits, deterministic), `must` for all 7 slots, and each audit fix.

UI change: Home "Shuffle" now steps through the ranked, diverse list (always a different look); Outfits "Shuffle" uses a seed.

## 8. Real-wardrobe review (28 pieces, menswear, 2026-11-14)

**Finding:** every outfit scored the same (8.98). Shirts were indistinguishable to the engine, so the pairing followed upload order. Work, Party and Date night returned identical looks; Festive suggested jeans for a wardrobe with no festive pieces; a logo was read as a "red accent"; a pair of sneakers saved as a Top (auto-fill had failed) could be suggested as a shirt.

**Added rules** (`styling()`, `shade()`, `occasionGap()` in `suggest.ts`):
- Top/bottom light–dark contrast (+), two different dark neutrals like navy + black (−), monochrome (+), soft light palette (named, no bonus)
- Shade read from the name too ("light wash", "dark"), because the palette has a single "denim"
- Sneakers with light/relaxed bottoms, leather with dark/smart ones
- Streetwear-only + classic-only pieces in one look (−)
- Party / Date night: darker palette (+)
- Summer pieces in heat, winter pieces in cold (+); distressed/ripped pieces (−) when the occasion isn't casual
- Secondary colours count only on patterned pieces (logos ignored)
- Festive with no festive pieces: explains instead of suggesting
- Pieces whose auto-fill never ran are flagged "Check details", kept out of outfits, and can be re-read with "Auto-fill now"

**Stylist rating of the top looks** (my judgement): before, 4–9/10, with an average around 6.5 and identical across occasions. After: 7–9/10, and occasion-specific (e.g. Party leads with black shirt + dark denim + leather; Casual with dark green shirt + light-wash + white sneakers).

**Known limits:** shade still depends on the colour/name the AI gives; one pair of smart shoes in the wardrobe means it repeats; fit and silhouette (wide-leg vs slim) aren't recorded, so the engine can't judge proportions.

## 9. Same shoes and same watch in every look (35 pieces, menswear, 2026-11-15)

Fixture: `src/lib/__audit__/real-wardrobe.ts` (9 shirts, 8 bottoms, 6 shoes, 9 watches, 3 sunglasses). Tests: "finishing pieces rotate" in `suggest.constraints.test.ts`.

**Finding:** six looks, one pair of sneakers and one watch across all of them. Shoes and accessories were chosen per look by score alone; five white sneakers and nine watches scored the same, so the first by id won every time. Only one bag *or* accessory was allowed, so a watch and sunglasses never appeared together. Shuffle barely changed anything: consecutive seeds gave the LCG nearly identical first numbers.

**Changes** (`suggest.ts`):
- `finishing()`: rules that tell finishing pieces apart. A shoe trim, dial or strap that repeats a colour of the clothes (+); gold / tan with warm tops, steel with cool tops (+, half as a penalty when crossed); black shoes or a black watch under a dark look (+); black shoes under light jeans without a black top (−); gold next to silver (−).
- Rotation: each look after the first is re-finished with a capped penalty for shoes / bags / accessories that earlier looks already wear (`W.rotate`).
- `kind()`: accessory type read from the name. One accessory per kind, up to 2 extras for "Sometimes" and 3 for "Always". No sunglasses for Party, Date night or Gym.
- Overlap between looks is measured on the clothes only and costs more (`W.overlap` 2), so 6 looks use at least 5 different shirts.
- Navy on dark-blue denim costs double the dark-on-dark penalty; sweatpants count as casual like ripped jeans; a formal watch is not penalised on an evening out; Party favours a deep colour on top.
- Formality spread ignores accessories (a dress watch with jeans is normal).
- Equal pieces take turns by day (tie-break hashed with the date); the Shuffle seed is hashed.
- Worn today is no longer penalised, so the look just logged with "Wear this" stays on screen; the rest penalty starts the next day.

**Result on the fixture** (Casual / Work / Date night / Party, 6 looks each): 1 pair of shoes and 1 watch before; at least 4 different shoes, 4 different watches and 5 different shirts after.

**Known limits:** the rules depend on the colour order auto-fill gives (case or strap first, dial second; the prompt now asks for this, older pieces may need an edit). Accessory type comes from the name.

## 2026-11-17: scores, honest Best match, specific reasons, stylist tip, learning from saves

Files: `src/lib/suggest-rules.ts` (rules, each credits a named factor), `src/lib/suggest-explain.ts` (0–10 scale, reason text, tip), `src/lib/suggest.ts` (pipeline).
Validation: `src/lib/suggest.validation.test.ts`; reference looks in `src/lib/__audit__/reference-looks.ts`.

| # | Change | Root cause in code | Trade-off |
|---|---|---|---|
| S1 | Every rule credits one factor (colour, occasion, style, footwear, balance, taste, learned, recency). `FACTOR_WEIGHT` is the one place to re-weight. | Score was one unlabelled sum. | Weights all 1 reproduce the previous ranking; changing them is a hypothesis to re-validate. |
| S2 | Stylist score 0–10 = `2.9 + 0.65 ×` the five stylist factors, soft ceiling above 8.5. Taste, learned and rotation are excluded. | Raw points had no fixed scale. | Fitted on 9 subjective references: mean error 0.6, Spearman 0.7. Small sample; refit as more stylist ratings arrive. |
| S3 | Verdict on the highest-scoring card only: "Best match" at ≥ 7, else "Best available". Card 1 says "Top pick for you" if taste put it first. | Card 1 was always "Best match". | Threshold 7 sits between the weakest reference (5.5 → 6.3) and the accepted ones. |
| S4 | Reasons rendered from reason codes with the actual piece names: one colour, one occasion, one shoes/shape line, plus one personal line. | Notes were fixed phrases ("Clean neutral palette", "Right level of dressy…"). | More text per card; the personal line gets its own slot. |
| S5 | Stylist tip = the single swap with an owned piece that adds ≥ 0.6 points, named by the factor it helps; or plain advice (two prints, warm piece in heat). | No tips. | Searches the top 12 candidates per spot only. |
| S6 | Saved looks: pieces saved together get +0.3 per pair (cap 0.9). Read once per screen visit. | Saves never fed back. | Capped below one explicit preference; never affects the stylist score. |
| S7 | Rules fixed after the reference check: jeans never cause a style clash; leather boots suit any denim; smart occasions prefer dark denim (daytime bonus, light-wash penalty; evenings use the palette rule only). | Auto-fill tags jeans "Streetwear", so classic shirt + jeans lost 0.8; mid-blue jeans + boots lost 0.4. | Changes rankings on purpose (e.g. light jeans drop for work). |
| S8 | Ties: comparisons ignore differences < 1e-9, then fall back to a stable order. | Float noise (≈1e-15) decided 60/126 snapshot ties. | None. |
| S9 | Speed: lean ranking score (no breakdown objects), per-item caches for name tests and shade. | | 1000 items: 49 → 16 ms; 35 items: 9 → 5 ms (Node, M-series). The last committed engine (simpler pipeline) ran 6 ms. |

Not done (by design): occasion sub-types, material/silhouette fields (no UI or data for them yet), analytics for save/accept rates (no event tracking exists).
Known disagreement: green tie-dye + cargos + sneakers rates 8.2 vs reference 7.5. There is no "visual busyness" rule, and the brief asks not to penalise streetwear for being bold.
