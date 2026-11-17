"use client";

import { motion } from "motion/react";
import { BEST_MIN } from "@/lib/suggest";
import type { Occasion } from "@/lib/types";
import { cn } from "@/lib/cn";

type LookScoreProps = {
  rating: number; occasion: Occasion;
  /** Stylist score of the same look for every occasion, in the user's order. */ fits: { occasion: Occasion; rating: number }[];
  onOccasion: (o: Occasion) => void; reasons: number; cautions: number;
};

/** Plain-language verdict; the thresholds are the same ones that decide "Best match" on suggestions. */
const verdict = (r: number) => (r >= BEST_MIN ? "Strong match" : r >= 5.5 ? "Works, with tweaks" : "Needs work");

/** Big score, verdict for the chosen occasion, and the same look rated for every other occasion. */
export function LookScore({ rating, occasion, fits, onOccasion, reasons, cautions }: LookScoreProps) {
  const best = fits.reduce((b, f) => (f.rating > b.rating ? f : b), fits[0]);
  return (
    <section aria-label="Stylist score" className="rounded-xl border border-line bg-surface p-5">
      <p className="text-label uppercase text-ink-3">Stylist score</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <motion.p key={`${occasion}-${rating}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-baseline gap-1">
            <span className="font-display text-[3.5rem] leading-none tracking-tight tabular-nums">{rating.toFixed(1)}</span>
            <span className="text-caption text-ink-3">/10</span>
          </motion.p>
          <p className="mt-2 font-display text-heading">{verdict(rating)} <span className="text-ink-3">for {occasion.toLowerCase()}</span></p>
        </div>
        <p className="pb-1 text-right text-[12px] leading-relaxed text-ink-3">
          {reasons} {reasons === 1 ? "thing" : "things"} working<br />{cautions} to watch
        </p>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-3 text-caption text-ink-2">
          {best.occasion === occasion ? "This is the occasion it suits best." : <>Suits <button type="button" onClick={() => onOccasion(best.occasion)} className="font-medium text-ink underline underline-offset-4">{best.occasion.toLowerCase()}</button> best ({best.rating.toFixed(1)}).</>}
        </p>
        <div role="radiogroup" aria-label="Rate for occasion" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
          {fits.map((f) => {
            const on = f.occasion === occasion;
            return (
              <button key={f.occasion} type="button" role="radio" aria-checked={on} onClick={() => onOccasion(f.occasion)}
                className={cn("flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-caption font-medium transition-colors active:scale-[0.97]",
                  on ? "border-ink bg-ink text-on-ink" : "border-line text-ink-2 hover:border-ink-3 hover:text-ink")}>
                {f.occasion}<span className={cn("tabular-nums", on ? "opacity-60" : "text-ink-3")}>{f.rating.toFixed(1)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
