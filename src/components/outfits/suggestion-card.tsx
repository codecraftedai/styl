"use client";

import { useState } from "react";
import { Bookmark, Check, Lightbulb, RefreshCw, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { today, useStore } from "@/lib/store";
import type { Suggestion } from "@/lib/suggest";
import type { Swapper } from "@/lib/use-suggestions";
import type { Occasion } from "@/lib/types";
import { Collage } from "./collage";
import { ScoreBreakdown } from "./score-breakdown";

type SuggestionCardProps = {
  s: Suggestion; occasion: Occasion;
  /** Position in the ranked list (0 = first). */ index: number;
  /** Overrides the piece count, e.g. "2 of 6". */ meta?: string;
  /** Lets the user tap a piece to swap it. */ swapper?: Swapper;
  /** Shows a "Next look" control beside the title, next to the counter it changes. */ onNext?: () => void;
};

/** Honest titles: "Best match" only when the engine says the look earns it. */
function titleFor(s: Suggestion, index: number, edited: boolean) {
  if (edited) return "Your version";
  if (s.verdict === "best") return "Best match";
  if (s.verdict === "available") return "Best available";
  return index === 0 ? "Top pick for you" : `Option ${index + 1}`;
}

export function SuggestionCard({ s: suggested, occasion, index, meta, swapper, onNext }: SuggestionCardProps) {
  const { urls, markWorn, saveOutfit } = useStore();
  const [saved, setSaved] = useState(false);
  // The look as the user has adjusted it. Parents key this card by its pieces, so a new suggestion starts fresh.
  const [s, setLook] = useState(suggested);
  const edited = s !== suggested;
  const swappable = swapper && s.items.some((i) => swapper.can(s.items, i));
  const wornToday = s.items.every((i) => i.lastWorn === today());
  return (
    <article className="flex flex-col rounded-xl border border-line bg-surface p-3 md:p-4">
      <Collage items={s.items} urls={urls} swappable={(i) => !!swapper?.can(s.items, i)}
        onSwap={swapper && ((i) => { const next = swapper.next(s.items, i); if (next) { setLook(next); setSaved(false); } })} />
      {swappable && <p className="mt-2.5 text-center text-[12px] text-ink-3">Tap a piece to swap it</p>}

      <div className="px-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-[1.375rem] leading-tight tracking-tight">{titleFor(s, index, edited)}</h3>
            <p className="mt-0.5 text-[12px] text-ink-3 tabular-nums">{meta ?? `${s.items.length} pieces`} · {occasion}</p>
          </div>
          {onNext && (
            <button type="button" onClick={onNext} className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-line px-4 text-caption font-medium text-ink transition-colors hover:border-ink-3 active:scale-95">
              <RefreshCw className="size-3.5" aria-hidden /> Next look
            </button>
          )}
        </div>
        {s.verdict === "available" && !edited && (
          <p className="mt-2 text-[12px] text-ink-3">Your strongest option for {occasion.toLowerCase()} right now. A few more pieces would give better ones.</p>
        )}

        {s.reasons.length > 0 && (
          <section aria-label="Why this works" className="mt-4">
            <h4 className="mb-2 text-label uppercase text-ink-3">Why this works</h4>
            <ul className="divide-y divide-line rounded-md bg-stone/60">
              {s.reasons.map((r) => (
                <li key={r} className="flex items-start gap-2.5 px-3.5 py-2.5 text-caption text-ink-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-champagne" aria-hidden />{r}
                </li>
              ))}
            </ul>
          </section>
        )}
        {s.tip && (
          <p className="mt-3 flex items-start gap-2.5 rounded-md border border-dashed border-line px-3.5 py-2.5 text-caption text-ink-2">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden />
            <span><span className="font-medium text-ink">Stylist tip: </span>{s.tip}</span>
          </p>
        )}

        <ScoreBreakdown rating={s.rating} factors={s.factors} />

        <div className="mt-4 mb-1 flex gap-2">
          <Button block disabled={wornToday} onClick={() => { markWorn(s.items.map((i) => i.id)); toast("Logged. Looking good today."); }}>
            {wornToday ? <><Check className="size-4" aria-hidden /> Wearing today</> : <><Shirt className="size-4" aria-hidden /> Wear this</>}
          </Button>
          <Button variant="secondary" className="w-12 shrink-0 px-0" aria-label={saved ? "Saved" : "Save outfit"} disabled={saved}
            onClick={() => { saveOutfit({ name: `${occasion} look`, itemIds: s.items.map((i) => i.id), occasion }); setSaved(true); toast("Saved to your outfits"); }}>
            <Bookmark className={saved ? "size-4 fill-ink" : "size-4"} aria-hidden />
          </Button>
        </div>
      </div>
    </article>
  );
}
