"use client";

import { CloudRain, CloudSun, Snowflake, Sparkles, Sun } from "lucide-react";
import { SEASON_MODES, type SeasonMode } from "@/lib/types";
import { cn } from "@/lib/cn";

const OPTION: Record<SeasonMode, { icon: typeof Sun; note: string }> = {
  Auto: { icon: Sparkles, note: "From live weather, or your climate's usual weather this month. Rain switches on rainy-day rules." },
  Summer: { icon: Sun, note: "Light, breathable pieces. No jackets." },
  Monsoon: { icon: CloudRain, note: "Rain-friendly: darker bottoms, no white or suede shoes, sandals welcome." },
  Winter: { icon: Snowflake, note: "A jacket or coat in every look, warm pieces first." },
  Pleasant: { icon: CloudSun, note: "A light layer only when it lifts the look." },
};

/** Which season we dress for. A picked season overrides the weather until it's set back to Auto. */
export function SeasonPicker({ value, onChange }: { value: SeasonMode; onChange: (s: SeasonMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Season" className="flex flex-col gap-2.5">
      {SEASON_MODES.map((s) => {
        const on = value === s;
        const { icon: Icon, note } = OPTION[s];
        return (
          <button key={s} type="button" role="radio" aria-checked={on} onClick={() => onChange(s)}
            className={cn("flex items-center gap-4 rounded-lg border px-4 py-3.5 text-left transition-colors active:scale-[0.99]", on ? "border-ink bg-stone" : "border-line bg-surface hover:border-ink-3")}>
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", on ? "bg-ink text-on-ink" : "bg-stone text-ink-2")}><Icon className="size-[18px]" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{s === "Auto" ? "Auto (recommended)" : s}</span>
              <span className="block text-caption text-ink-3">{note}</span>
            </span>
            <span className={cn("size-5 shrink-0 rounded-full border-2 transition-all", on ? "border-[6px] border-ink" : "border-line")} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
