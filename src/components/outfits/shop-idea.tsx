"use client";

import { useState } from "react";
import { ArrowRight, ChevronRight, ExternalLink, Footprints, Layers, Shirt, ShoppingBag, Watch } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Swatch } from "@/components/ui/swatch";
import { toast } from "@/components/ui/toast";
import { AFFILIATE, CATALOGUE, type ShopIdea as Idea } from "@/lib/shop";
import type { Factor } from "@/lib/suggest";
import type { Item, Occasion, Slot } from "@/lib/types";
import { useShopIdea } from "@/lib/use-shop";
import { cn } from "@/lib/cn";

const ICON: Record<Slot, typeof Shirt> = { shoes: Footprints, outer: Layers, top: Shirt, bottom: Shirt, "one-piece": Shirt, bag: ShoppingBag, accessory: Watch };
const WHY: Record<Factor, (o: Occasion) => string> = {
  colour: () => "It pulls the colours together.",
  occasion: (o) => `It makes the look right for ${o.toLowerCase()}.`,
  style: () => "It brings the pieces into one style.",
  footwear: () => "It suits the rest of the look better.",
  balance: () => "It balances the proportions.",
};

const action = (i: Idea) => (i.replaces ? `Swap your ${i.replaces.name.toLowerCase()} for ${i.name.toLowerCase()}` : `Add ${i.name.toLowerCase()}`);

type ShopIdeaProps = { look: Item[]; occasion: Occasion; must?: string; /** "row" sits inside a suggestion card; "section" on the review page. */ variant?: "row" | "section" };

/** "Complete the look": one piece the user doesn't own that would clearly lift this outfit, with store searches. */
export function ShopIdea({ look, occasion, must, variant = "row" }: ShopIdeaProps) {
  const { idea, hide, wear } = useShopIdea(look, occasion, must);
  const [open, setOpen] = useState(false);
  if (!idea) return null;
  const Icon = ICON[idea.slot];
  const colour = CATALOGUE.find((c) => c.key === idea.key)?.item.colours[0];

  return (
    <>
      <div className={cn(variant === "section" && "flex flex-col gap-2")}>
        {variant === "section" && <h2 className="text-label uppercase text-ink-3">Complete the look</h2>}
        <button type="button" onClick={() => setOpen(true)}
          className={cn("flex w-full items-center gap-3 rounded-md border border-line px-3.5 py-3 text-left transition-colors hover:border-ink-3", variant === "row" ? "mt-3" : "bg-surface")}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone text-ink-2"><Icon className="size-4" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            {variant === "row" && <span className="block text-[12px] text-ink-3">Complete the look</span>}
            <span className="block truncate text-caption text-ink">{action(idea)}</span>
          </span>
          <span className="shrink-0 text-[12px] text-ink-3 tabular-nums">{idea.before.toFixed(1)} → <span className="font-medium text-ink">{idea.after.toFixed(1)}</span></span>
          <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
        </button>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Complete the look">
        <div className="flex flex-col gap-5 pb-2">
          <div className="flex items-center gap-4">
            <span className="relative flex size-20 shrink-0 items-center justify-center rounded-lg bg-studio text-ink-2">
              <Icon className="size-8 stroke-[1.25]" aria-hidden />
              {colour && <Swatch id={colour} className="absolute right-2 bottom-2 size-4" />}
            </span>
            <div className="min-w-0">
              <p className="font-display text-heading">{idea.name}</p>
              <p className="mt-1 text-caption text-ink-2">{action(idea)}. {WHY[idea.because](occasion)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
            <span className="text-caption text-ink-3">Stylist score for this look</span>
            <span className="flex items-center gap-2 tabular-nums">
              <span className="text-ink-3">{idea.before.toFixed(1)}</span>
              <ArrowRight className="size-3.5 text-ink-3" aria-hidden />
              <span className="font-display text-heading">{idea.after.toFixed(1)}</span>
              <span className="text-caption text-success">+{(idea.after - idea.before).toFixed(1)}</span>
            </span>
          </div>

          <section aria-label="Find it">
            <h3 className="mb-2 text-label uppercase text-ink-3">Find it on</h3>
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {idea.links.map((l) => (
                <li key={l.store}>
                  <a href={l.url} target="_blank" rel={AFFILIATE ? "noopener noreferrer sponsored" : "noopener noreferrer"}
                    className="flex min-h-13 items-center justify-between px-4 text-caption font-medium transition-colors hover:bg-stone">
                    {l.store}<ExternalLink className="size-4 text-ink-3" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-ink-3">
              Opens a search for &ldquo;{idea.name.toLowerCase()}{wear === "Both" ? "" : ` ${wear.toLowerCase()}`}&rdquo;. Prices and stock vary by store.
              {AFFILIATE && " Some links are affiliate links: we may earn a small commission, at no cost to you."}
            </p>
          </section>

          <Button variant="ghost" onClick={async () => { setOpen(false); await hide(idea.key); toast(`We won't suggest ${idea.name.toLowerCase()} again`); }}>
            Not interested
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
