"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, X } from "lucide-react";
import { ItemImage } from "@/components/wardrobe/item-image";
import { useStore } from "@/lib/store";
import type { Item, Occasion, Slot } from "@/lib/types";
import { cn } from "@/lib/cn";

const ROWS: { slot: Slot; label: string }[] = [
  { slot: "top", label: "Top" }, { slot: "bottom", label: "Bottom" }, { slot: "one-piece", label: "Full outfit" },
  { slot: "outer", label: "Layer" }, { slot: "shoes", label: "Shoes" }, { slot: "bag", label: "Bag" }, { slot: "accessory", label: "Accessories" },
];

/** What's still needed before a look can be checked; null when it's wearable. */
function missing(chosen: Item[]): string | null {
  const has = (s: Slot) => chosen.some((i) => i.slot === s);
  if (has("one-piece") || (has("top") && has("bottom"))) return null;
  if (has("top")) return "Add a bottom";
  if (has("bottom")) return "Add a top";
  return "Add a top and bottom";
}

type BuilderProps = { occasion: Occasion; initial?: string[] };

/**
 * Pick pieces; a small tray keeps count and leads to the review page. The rows stay fully visible:
 * the old in-page preview covered most of a phone screen while picking.
 */
export function Builder({ occasion, initial = [] }: BuilderProps) {
  const { items, urls } = useStore();
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(() => initial.filter((id) => items.some((i) => i.id === id)));
  const chosen = picked.map((id) => items.find((i) => i.id === id)!).filter(Boolean);
  const need = missing(chosen);

  // One per slot (accessories can stack). A full outfit replaces top + bottom and vice versa.
  function toggle(id: string) {
    const it = items.find((i) => i.id === id)!;
    if (picked.includes(id)) return setPicked(picked.filter((p) => p !== id));
    const clash = (s: Slot) => s === it.slot || (it.slot === "one-piece" && (s === "top" || s === "bottom")) || (s === "one-piece" && (it.slot === "top" || it.slot === "bottom"));
    setPicked([...items.filter((i) => picked.includes(i.id) && (it.slot === "accessory" || !clash(i.slot))).map((i) => i.id), id]);
  }

  return (
    <div className="pb-32">
      <p className="mb-6 text-caption text-ink-3">Tap one piece per row. We&apos;ll score the look and suggest what would lift it.</p>
      <div className="flex flex-col gap-7">
        {ROWS.map(({ slot, label }) => {
          const list = items.filter((i) => i.slot === slot);
          if (!list.length) return null;
          const count = chosen.filter((i) => i.slot === slot).length;
          return (
            <section key={slot}>
              <h3 className="mb-3 flex items-center gap-2 text-label uppercase text-ink-3">{label}{count > 0 && <Check className="size-3.5 text-champagne" aria-label="picked" />}</h3>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:px-0">
                {list.map((i) => {
                  const on = picked.includes(i.id);
                  return (
                    <button key={i.id} type="button" aria-pressed={on} aria-label={i.name} onClick={() => toggle(i.id)} className="relative w-24 shrink-0 rounded-md transition-transform active:scale-95">
                      <ItemImage src={urls[i.imagePath]} alt="" fit="cover" className={cn("aspect-[4/5] rounded-md ring-offset-2 ring-offset-ivory transition-[box-shadow,opacity]", on ? "ring-2 ring-ink" : "opacity-85 hover:opacity-100")} />
                      {on && <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-on-ink"><Check className="size-3.5" /></span>}
                      <span className="mt-1.5 block truncate text-[11px] text-ink-2">{i.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <AnimatePresence>
        {chosen.length > 0 && (
          <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 px-4 md:bottom-6 md:left-64">
            <div className="mx-auto flex max-w-md items-center gap-2 rounded-full border border-line bg-surface/90 p-1.5 pl-2 shadow-float backdrop-blur-xl">
              <div className="flex -space-x-3">
                {chosen.slice(0, 4).map((i) => (
                  <ItemImage key={i.id} src={urls[i.imagePath]} alt="" fit="cover" className="size-10 rounded-full ring-2 ring-surface" />
                ))}
              </div>
              <div className="min-w-0 flex-1 pl-1">
                <p className="truncate text-caption font-medium">{chosen.length} {chosen.length === 1 ? "piece" : "pieces"}</p>
                <p className="truncate text-[12px] text-ink-3">{need ?? "Ready to check"}</p>
              </div>
              <button type="button" aria-label="Clear selection" onClick={() => setPicked([])} className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-stone hover:text-ink">
                <X className="size-4" />
              </button>
              <button type="button" disabled={!!need} onClick={() => router.push(`/look?items=${picked.join(",")}&occasion=${encodeURIComponent(occasion)}`)}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-caption font-semibold text-on-ink transition-[opacity,transform] hover:bg-ink/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                Check look <ArrowRight className="size-4" aria-hidden />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
