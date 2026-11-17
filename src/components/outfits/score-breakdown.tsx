"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { Factor } from "@/lib/suggest";
import { cn } from "@/lib/cn";

const LABEL: Record<Factor, string> = { colour: "Colour harmony", occasion: "Occasion fit", style: "Style cohesion", footwear: "Footwear", balance: "Balance" };
const UNKNOWN: Record<Factor, string> = { colour: "Not enough info", occasion: "Not enough info", style: "Not enough info", footwear: "No shoes in this look", balance: "Fit not known" };

/** Words, not decimals, per factor: the rules are a stylist's judgment, so false precision would mislead. */
const word = (v: number) => (v >= 8 ? "Strong" : v >= 6 ? "Good" : v >= 4 ? "Fair" : "Weak");

type ScoreBreakdownProps = { rating: number; factors: Record<Factor, number | null>; defaultOpen?: boolean; note?: string };

/** Stylist score with a collapsible per-factor breakdown. Collapsed by default so the photos stay the focus. */
const NOTE = "A stylist's judgement from colour, occasion, style, shoes and proportions. Your own taste decides the order, not this score.";

export function ScoreBreakdown({ rating, factors, defaultOpen = false, note = NOTE }: ScoreBreakdownProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="mt-4">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-3 rounded-md border border-line px-3.5 text-left transition-colors hover:border-ink-3">
        <span className="flex items-baseline gap-1">
          <span className="font-display text-[1.375rem] leading-none tabular-nums">{rating.toFixed(1)}</span>
          <span className="text-[12px] text-ink-3">/10</span>
        </span>
        <span className="flex-1 text-caption text-ink-2">Stylist score</span>
        <span className="text-[12px] text-ink-3">{open ? "Hide" : "Breakdown"}</span>
        <ChevronDown className={cn("size-4 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <dl className="flex flex-col gap-3 px-1 pt-4">
              {(Object.keys(LABEL) as Factor[]).map((f) => {
                const v = factors[f];
                return (
                  <div key={f} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-caption">
                    <dt className="text-ink-3">{LABEL[f]}</dt>
                    <dd className="flex items-center gap-3">
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
                        {/* Inline width: the one value Tailwind can't express statically. */}
                        {v !== null && <span className="block h-full rounded-full bg-ink-2" style={{ width: `${v * 10}%` }} />}
                      </span>
                      <span className={cn("shrink-0 text-right", v === null ? "text-ink-3" : "text-ink")}>{v === null ? UNKNOWN[f] : word(v)}</span>
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="px-1 pt-3 pb-1 text-[12px] text-ink-3">{note}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
