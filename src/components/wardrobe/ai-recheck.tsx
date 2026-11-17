"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { analyse } from "@/lib/analysis";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Swatch } from "@/components/ui/swatch";
import { toast } from "@/components/ui/toast";
import { colourById } from "@/lib/colours";
import { useStore } from "@/lib/store";
import type { Item, Slot } from "@/lib/types";
import { usePieceImpact, type Impact } from "@/lib/use-suggestions";
import { cn } from "@/lib/cn";

const SLOT: Record<Slot, string> = { top: "Top", bottom: "Bottom", "one-piece": "Full outfit", outer: "Layer", shoes: "Shoes", bag: "Bag", accessory: "Accessory" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The details the AI can read from a photo. Brand and notes are the user's own and are never touched. */
const FIELDS: { key: keyof Item; label: string; show: (i: Item) => ReactNode; same?: (a: Item, b: Item) => boolean }[] = [
  { key: "name", label: "Name", show: (i) => i.name },
  { key: "slot", label: "Worn as", show: (i) => SLOT[i.slot] },
  { key: "category", label: "Category", show: (i) => i.category },
  { key: "colours", label: "Colours", show: (i) => <span className="inline-flex flex-wrap items-center gap-1.5">{i.colours.map((c) => <span key={c} className="inline-flex items-center gap-1"><Swatch id={c} />{colourById(c)?.label}</span>)}</span>, same: (a, b) => a.colours.join() === b.colours.join() },
  { key: "pattern", label: "Pattern", show: (i) => i.pattern },
  { key: "formality", label: "Dressiness", show: (i) => cap(i.formality) },
  { key: "season", label: "Season", show: (i) => (i.season === "all" ? "All year" : cap(i.season)) },
  { key: "styles", label: "Style", show: (i) => i.styles.join(", ") || "None", same: (a, b) => [...a.styles].sort().join() === [...b.styles].sort().join() },
  { key: "fit", label: "Fit", show: (i) => (i.fit ? cap(i.fit) : "Not set") },
];

/** Ask the AI to read the photo again, show what would change and what it does to the looks, then apply or keep. */
export function useAiRecheck(item: Item, onApplied: (previous: Item) => void) {
  const { urls, token, updateItem } = useStore();
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Item | null>(null);

  async function run() {
    const src = urls[item.imagePath];
    if (!src) return toast("The photo hasn't loaded yet. Try again in a moment.", "error");
    setBusy(true);
    try {
      const a = await analyse(await (await fetch(src)).blob(), item.colours, await token());
      if (a.rejected) toast(a.rejected, "error");
      else if (a.source !== "ai") toast("The AI is busy. Try again in a minute.", "error");
      else setProposal({ ...item, name: a.name, category: a.category, slot: a.slot, colours: a.colours, pattern: a.pattern, formality: a.formality, season: a.season, styles: a.styles, fit: a.fit ?? item.fit });
    } catch { toast("Couldn't load the photo. Check your connection.", "error"); }
    finally { setBusy(false); }
  }

  const sheet = proposal && (
    <RecheckSheet before={item} after={proposal} onClose={() => setProposal(null)}
      onApply={async () => { const prev = item; setProposal(null); await updateItem(proposal); onApplied(prev); }} />
  );
  return { run, busy, sheet };
}

function Delta({ before, after }: { before: Impact; after: Impact }) {
  const d = before.rating !== null && after.rating !== null ? Math.round((after.rating - before.rating) * 10) / 10 : null;
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-caption">
      <span className="text-ink-2">{before.occasion}</span>
      <span className="flex items-center gap-2 tabular-nums">
        <span className="text-ink-3">{before.rating?.toFixed(1) ?? "—"}</span>
        <ArrowRight className="size-3.5 text-ink-3" aria-hidden />
        <span className="font-medium text-ink">{after.rating?.toFixed(1) ?? "—"}</span>
        <span className={cn("w-12 text-right", d === null || d === 0 ? "text-ink-3" : d > 0 ? "text-success" : "text-danger")}>
          {d === null ? (after.rating === null ? "no look" : "new") : d === 0 ? "same" : `${d > 0 ? "+" : ""}${d.toFixed(1)}`}
        </span>
      </span>
    </li>
  );
}

function RecheckSheet({ before, after, onApply, onClose }: { before: Item; after: Item; onApply: () => void; onClose: () => void }) {
  const impact = usePieceImpact();
  const [was, now] = useMemo(() => [impact(before), impact(after)], [impact, before, after]);
  const changed = FIELDS.filter((f) => !(f.same ? f.same(before, after) : before[f.key] === after[f.key]));
  return (
    <BottomSheet open onClose={onClose} title="AI re-check">
      {!changed.length ? (
        <div className="pb-2">
          <p className="text-ink-2">The AI read the photo the same way. Your details already match.</p>
          <Button block className="mt-6" onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-2">
          <section aria-label="What changes">
            <h3 className="mb-2 text-label uppercase text-ink-3">What changes · {changed.length} of {FIELDS.length}</h3>
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {changed.map((f) => (
                <li key={f.key} className="px-4 py-3 text-caption">
                  <p className="text-ink-3">{f.label}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-ink-3 line-through decoration-ink-3/60">{f.show(before)}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-ink-3" aria-hidden />
                    <span className="font-medium text-ink">{f.show(after)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
          <section aria-label="Effect on your looks">
            <h3 className="mb-2 text-label uppercase text-ink-3">Best look with it · stylist score</h3>
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">{was.map((b, k) => <Delta key={b.occasion} before={b} after={now[k]} />)}</ul>
            <p className="mt-2 text-[12px] text-ink-3">How well we can style this piece now vs with the new details. Brand and notes stay as you wrote them.</p>
          </section>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Keep current</Button>
            <Button className="flex-1" onClick={onApply}>Use AI details</Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
