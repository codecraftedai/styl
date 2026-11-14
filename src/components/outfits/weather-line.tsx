import { CloudSun, Snowflake, Sun } from "lucide-react";
import type { Weather } from "@/lib/suggest";
import { weatherLabel, type Now } from "@/lib/weather";

const ICON = { hot: Sun, mild: CloudSun, cold: Snowflake };
const WORD = { hot: "Warm day", mild: "Mild day", cold: "Cold day" };

export function WeatherLine({ weather, now }: { weather: Weather; now: Now | null }) {
  const Icon = ICON[weather];
  return (
    <p className="flex items-center gap-1.5 text-caption text-ink-3">
      <Icon className="size-3.5" aria-hidden />
      {now ? `${now.tempC}° · ${weatherLabel(now.code)}` : WORD[weather]}
    </p>
  );
}
