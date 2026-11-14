"use client";

import { useMemo } from "react";
import { today, useStore } from "./store";
import { missingForSuggestions, suggest, weatherOf } from "./suggest";
import { EMPTY_PREFS, OCCASIONS, type Occasion } from "./types";
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

export function useSuggestions(occasion: Occasion, seed: number, withItem?: string | null) {
  const { items, profile } = useStore();
  const prefs = useMemo(() => ({ ...EMPTY_PREFS, ...profile?.prefs }), [profile]);
  const now = useWeather(prefs.liveWeather);
  const tempC = now?.tempC ?? null;

  const list = useMemo(() => {
    return suggest(items, { occasion, tempC, prefs, today: today(), seed, must: withItem ?? undefined }, 6);
  }, [items, occasion, tempC, prefs, seed, withItem]);

  return { list, missing: missingForSuggestions(items), weather: weatherOf(tempC, prefs.climate, prefs.tempFeel), now };
}
