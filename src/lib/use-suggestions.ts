"use client";

import { useMemo, useState } from "react";
import { today, useStore } from "./store";
import { needsReview } from "./analysis";
import { missingForSuggestions, occasionGap, rate, suggest, swap, swapOptions, weatherOf, type Context, type Suggestion } from "./suggest";
import { isRainCode, isWet } from "./suggest-rules";
import { EMPTY_PREFS, OCCASIONS, type Item, type Occasion } from "./types";
import { useWeather } from "./weather";

/** Occasions ordered: the user's picks first, then the rest. */
export function useOccasions(): Occasion[] {
  const { profile } = useStore();
  const mine = profile?.prefs.occasions ?? [];
  return [...mine, ...OCCASIONS.filter((o) => !mine.includes(o))];
}

/** Sensible default: Work on weekdays if they dress for work, otherwise their first pick. */
export function defaultOccasion(list: Occasion[], picked: Occasion[]): Occasion {
  const weekday = new Date().getDay() % 6 !== 0;
  return weekday && picked.includes("Work") ? "Work" : (list[0] ?? "Casual");
}

export type Swapper = { can(look: Item[], target: Item): boolean; next(look: Item[], target: Item): Suggestion | null };

export function useSuggestions(occasion: Occasion, seed: number, withItem?: string | null) {
  const { items, profile, outfits } = useStore();
  const prefs = useMemo(() => ({ ...EMPTY_PREFS, ...profile?.prefs }), [profile]);
  const now = useWeather(prefs.liveWeather);
  const tempC = now?.tempC ?? null;

  // Laundry and unchecked pieces (auto-fill never ran, details may be wrong) stay out; a "Style it" piece is still allowed.
  const clean = useMemo(() => items.filter((i) => i.id === withItem || (!prefs.laundry.includes(i.id) && !needsReview(i))), [items, prefs.laundry, withItem]);
  // Saved looks teach pairings (inferred taste, small and capped); explicit preferences in Profile still lead.
  // Read once per screen visit: saving a card must not re-rank the list under the user's thumb. It counts from the next visit.
  const [saved] = useState(() => outfits.map((o) => o.itemIds));
  const rain = !!now && isRainCode(now.code);
  const ctx = useMemo<Context>(() => ({ occasion, tempC, rain, prefs, today: today(), seed, must: withItem ?? undefined, saved }), [occasion, tempC, rain, prefs, seed, withItem, saved]);
  const list = useMemo(() => suggest(clean, ctx, 6), [clean, ctx]);
  /** Tap-to-swap on a card: the piece chosen with "Style it" stays put. */
  const swapper = useMemo<Swapper>(() => ({
    can: (look, target) => target.id !== withItem && swapOptions(clean, look, target, ctx).length > 1,
    next: (look, target) => swap(clean, look, target, ctx),
  }), [clean, ctx, withItem]);

  const missing = useMemo(() => missingForSuggestions(items.filter((i) => !prefs.laundry.includes(i.id))) && (missingForSuggestions(items) ?? "Most of your pieces are in the laundry. Mark some clean in your wardrobe."), [items, prefs.laundry]);
  const unchecked = items.filter(needsReview).length;
  return { list, swapper, missing, unchecked, gap: occasionGap(items, occasion), weather: weatherOf(tempC, prefs.climate, prefs.tempFeel, today(), prefs.currentSeason), now, season: prefs.currentSeason, wet: isWet(prefs.currentSeason, rain) };
}

/** Rates a look the user built, for any occasion, with the same rules as suggestions. Tips only use clean, checked pieces. */
export function useLookRater() {
  const { items, profile, outfits } = useStore();
  const prefs = useMemo(() => ({ ...EMPTY_PREFS, ...profile?.prefs }), [profile]);
  const now = useWeather(prefs.liveWeather);
  const tempC = now?.tempC ?? null;
  const clean = useMemo(() => items.filter((i) => !prefs.laundry.includes(i.id) && !needsReview(i)), [items, prefs.laundry]);
  const saved = useMemo(() => outfits.map((o) => o.itemIds), [outfits]);
  const rain = !!now && isRainCode(now.code);
  const rateLook = useMemo(() => (look: Item[], occasion: Occasion): Suggestion =>
    rate(look, clean, { occasion, tempC, rain, prefs, today: today(), seed: 1, saved }), [clean, tempC, rain, prefs, saved]);
  return { rateLook, weather: weatherOf(tempC, prefs.climate, prefs.tempFeel, today(), prefs.currentSeason), now };
}

export type Impact = { occasion: Occasion; rating: number | null };

/**
 * How well a version of a piece styles: the best look the engine can build around it, for the user's top occasions.
 * Used to compare a piece's details before and after an edit (e.g. an AI re-check that changes it from top to layer).
 */
export function usePieceImpact() {
  const { items, profile, outfits } = useStore();
  const prefs = useMemo(() => ({ ...EMPTY_PREFS, ...profile?.prefs }), [profile]);
  const now = useWeather(prefs.liveWeather);
  const tempC = now?.tempC ?? null;
  const rain = !!now && isRainCode(now.code);
  const saved = useMemo(() => outfits.map((o) => o.itemIds), [outfits]);
  const occasions = useMemo<Occasion[]>(() => (prefs.occasions.length ? prefs.occasions : (["Casual", "Work", "Date night"] as Occasion[])).slice(0, 3), [prefs.occasions]);
  return useMemo(() => (piece: Item): Impact[] => {
    const wardrobe = [...items.filter((i) => i.id !== piece.id && !prefs.laundry.includes(i.id) && !needsReview(i)), piece];
    return occasions.map((occasion) => {
      const [best] = suggest(wardrobe, { occasion, tempC, rain, prefs, today: today(), seed: 1, must: piece.id, saved }, 1);
      return { occasion, rating: best?.rating ?? null };
    });
  }, [items, prefs, occasions, tempC, rain, saved]);
}
