"use client";

import { useState } from "react";
import { Bookmark, Check, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { today, useStore } from "@/lib/store";
import type { Suggestion } from "@/lib/suggest";
import type { Occasion } from "@/lib/types";
import { Collage } from "./collage";

export function SuggestionCard({ s, occasion, index }: { s: Suggestion; occasion: Occasion; index: number }) {
  const { urls, markWorn, saveOutfit } = useStore();
  const [saved, setSaved] = useState(false);
  const wornToday = s.items.every((i) => i.lastWorn === today());
  return (
    <article className="flex flex-col">
      <Collage items={s.items} urls={urls} />
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-heading">{index === 0 ? "Best match" : `Option ${index + 1}`}</h3>
        <span className="text-caption text-ink-3">{s.items.length} pieces</span>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {s.reasons.map((r) => <li key={r} className="flex gap-2 text-caption text-ink-2"><span className="text-champagne" aria-hidden>—</span>{r}</li>)}
      </ul>
      <p className="mt-2 line-clamp-2 text-caption text-ink-3">{s.items.map((i) => i.name).join(" · ")}</p>
      <div className="mt-4 flex gap-2">
        <Button block disabled={wornToday} onClick={() => { markWorn(s.items.map((i) => i.id)); toast("Logged. Looking good today."); }}>
          {wornToday ? <><Check className="size-4" aria-hidden /> Wearing today</> : <><Shirt className="size-4" aria-hidden /> Wear this</>}
        </Button>
        <Button variant="secondary" aria-label={saved ? "Saved" : "Save outfit"} disabled={saved}
          onClick={() => { saveOutfit({ name: `${occasion} look`, itemIds: s.items.map((i) => i.id), occasion }); setSaved(true); toast("Saved to your outfits"); }}>
          <Bookmark className={saved ? "size-4 fill-ink" : "size-4"} aria-hidden />
        </Button>
      </div>
    </article>
  );
}
