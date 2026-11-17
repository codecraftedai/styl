"use client";

import { useState, useSyncExternalStore } from "react";
import { Snowflake, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useStore } from "@/lib/store";
import { EMPTY_PREFS } from "@/lib/types";

const KEY = "styl:winter-nudge";
const WINTER = [10, 11, 0, 1]; // Nov–Feb (northern hemisphere, like the climate defaults in suggest-rules.ts)

/** In winter, without live weather we can only guess from the climate setting. One tap turns it on; dismissed once per season. */
export function WinterNudge() {
  const { profile, saveProfile } = useStore();
  const [closed, setClosed] = useState(false);
  const season = `${new Date().getFullYear() - (new Date().getMonth() < 2 ? 1 : 0)}`;
  const prefs = { ...EMPTY_PREFS, ...profile?.prefs };
  // Read on the client only; the server render treats it as dismissed so nothing flashes in and out.
  const dismissed = useSyncExternalStore(() => () => {}, () => { try { return localStorage.getItem(KEY) === season; } catch { return false; } }, () => true);

  if (closed || dismissed || prefs.liveWeather || prefs.currentSeason !== "Auto" || !profile || !WINTER.includes(new Date().getMonth())) return null;
  const dismiss = () => { setClosed(true); try { localStorage.setItem(KEY, season); } catch { /* fine */ } };
  return (
    <div className="mt-4 flex items-start gap-3 rounded-lg border border-line bg-surface p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone text-champagne"><Snowflake className="size-4" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="text-caption font-medium">Winter&apos;s here</p>
        <p className="mt-0.5 text-caption text-ink-3">Turn on live weather so we know which days need a jacket, or just tell us it&apos;s winter.</p>
        <Button variant="secondary" className="mt-3 h-9 px-4 text-caption" onClick={async () => {
          try { await saveProfile({ ...profile, prefs: { ...prefs, liveWeather: true } }); toast("Live weather on"); }
          catch { toast("Couldn't save. Try again.", "error"); }
        }}>Turn on live weather</Button>
        <Button variant="ghost" className="mt-3 ml-1 h-9 px-3 text-caption" onClick={async () => {
          try { await saveProfile({ ...profile, prefs: { ...prefs, currentSeason: "Winter" } }); toast("Dressing you for winter"); }
          catch { toast("Couldn't save. Try again.", "error"); }
        }}>Set to winter</Button>
      </div>
      <button type="button" aria-label="Dismiss" onClick={dismiss} className="-mt-1 -mr-1 flex size-10 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-stone hover:text-ink">
        <X className="size-4" />
      </button>
    </div>
  );
}
