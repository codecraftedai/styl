"use client";

import { useEffect, useState } from "react";

export type Now = { tempC: number; code: number };
const CACHE = "styl:weather";

// Open-Meteo: free, no API key. Only called when the user turned on live weather (location permission).
function cached(): Now | null {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE) ?? "null");
    return c && Date.now() - c.at < 30 * 60_000 ? c.now : null;
  } catch { return null; }
}

export function useWeather(enabled: boolean): Now | null {
  const [now, setNow] = useState<Now | null>(() => (enabled ? cached() : null));
  useEffect(() => {
    if (!enabled || !("geolocation" in navigator) || cached()) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude.toFixed(2)}&longitude=${coords.longitude.toFixed(2)}&current=temperature_2m,weather_code`);
        const j = await r.json();
        const n = { tempC: Math.round(j.current.temperature_2m), code: j.current.weather_code };
        setNow(n);
        try { sessionStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), now: n })); } catch { /* ignore */ }
      } catch { /* weather is a nice-to-have */ }
    }, () => {}, { maximumAge: 3600_000, timeout: 8000 });
  }, [enabled]);
  return now;
}

export const weatherLabel = (code: number) =>
  code === 0 ? "Clear" : code <= 3 ? "Partly cloudy" : code <= 48 ? "Foggy" : code <= 67 ? "Rain" : code <= 77 ? "Snow" : code <= 82 ? "Showers" : "Storm";
