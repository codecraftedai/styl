import { CloudRain, CloudSun, Snowflake, Sun } from "lucide-react";
import type { Weather } from "@/lib/suggest";
import type { SeasonMode } from "@/lib/types";
import { weatherLabel, type Now } from "@/lib/weather";

const ICON = { hot: Sun, mild: CloudSun, cold: Snowflake };
const WORD = { hot: "Warm day", mild: "Mild day", cold: "Cold day" };
const SEASON_ICON = { Summer: Sun, Monsoon: CloudRain, Winter: Snowflake, Pleasant: CloudSun };

type WeatherLineProps = { weather: Weather; now: Now | null; /** Season the user picked in Profile; shown instead of the reading so it's never forgotten. */ season?: SeasonMode; wet?: boolean };

export function WeatherLine({ weather, now, season = "Auto", wet }: WeatherLineProps) {
  if (season !== "Auto") {
    const Icon = SEASON_ICON[season];
    return (
      <p className="flex items-center gap-1.5 text-caption text-ink-2">
        <Icon className="size-3.5" aria-hidden />{season}<span className="text-ink-3">· set by you</span>
      </p>
    );
  }
  const Icon = wet ? CloudRain : ICON[weather];
  return (
    <p className="flex items-center gap-1.5 text-caption text-ink-2">
      <Icon className="size-3.5" aria-hidden />
      {now ? `${now.tempC}° · ${weatherLabel(now.code)}` : WORD[weather]}
    </p>
  );
}
