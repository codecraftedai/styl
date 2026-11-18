"use client";

import { useMemo } from "react";
import { needsReview } from "./analysis";
import { completeTheLook, type ShopIdea } from "./shop";
import { isRainCode } from "./suggest-rules";
import { today, useStore } from "./store";
import { EMPTY_PREFS, type Item, type Occasion } from "./types";
import { useWeather } from "./weather";

/**
 * The one piece worth buying for this look (null when nothing clears the bar, when the user owns something
 * that does the job, or when shopping ideas are off in Profile). `hide` = "Not interested", remembered in prefs.
 */
export function useShopIdea(look: Item[], occasion: Occasion, must?: string) {
  const { items, profile, saveProfile } = useStore();
  const prefs = useMemo(() => ({ ...EMPTY_PREFS, ...profile?.prefs }), [profile]);
  const now = useWeather(prefs.liveWeather);
  const tempC = now?.tempC ?? null;
  const rain = !!now && isRainCode(now.code);
  const wardrobe = useMemo(() => items.filter((i) => look.includes(i) || (!prefs.laundry.includes(i.id) && !needsReview(i))), [items, look, prefs.laundry]);

  const idea: ShopIdea | null = useMemo(() => {
    if (!prefs.shopping || look.length < 2) return null;
    return completeTheLook(look, wardrobe, { occasion, tempC, rain, prefs, today: today(), seed: 1, must }, prefs.shopHidden).buy;
  }, [look, wardrobe, occasion, tempC, rain, prefs, must]);

  const hide = async (key: string) => {
    if (!profile) return;
    await saveProfile({ ...profile, prefs: { ...prefs, shopHidden: [...new Set([...prefs.shopHidden, key])] } });
  };
  return { idea, hide, wear: prefs.wear };
}
