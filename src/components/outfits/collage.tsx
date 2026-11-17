"use client";

import { motion } from "motion/react";
import { ArrowLeftRight } from "lucide-react";
import type { Item, Slot } from "@/lib/types";
import { cn } from "@/lib/cn";
import { ItemImage } from "@/components/wardrobe/item-image";

const ORDER: Slot[] = ["outer", "top", "one-piece", "bottom", "shoes", "bag", "accessory"];
const MAIN: Slot[] = ["outer", "top", "one-piece", "bottom"];
const EASE = [0.22, 1, 0.36, 1] as const;

type CollageProps = { items: Item[]; urls: Record<string, string>; size?: "lg" | "sm"; /** Pieces the user can tap to swap for another one. */ swappable?: (item: Item) => boolean; onSwap?: (item: Item) => void };

/** Flat-lay board: clothes large on top, shoes and accessories in a smaller row, all on the studio backdrop. */
export function Collage({ items, urls, size = "lg", swappable, onSwap }: CollageProps) {
  const sorted = [...items].sort((a, b) => ORDER.indexOf(a.slot) - ORDER.indexOf(b.slot));
  const main = sorted.filter((i) => MAIN.includes(i.slot));
  const small = sorted.filter((i) => !MAIN.includes(i.slot));
  const gap = size === "lg" ? "gap-2" : "gap-1";

  const tile = (i: Item, shape: string) => {
    const image = <ItemImage src={urls[i.imagePath]} alt={i.name} fit="cover" className={cn(size === "lg" ? "rounded-md" : "rounded-sm", shape)} />;
    if (!onSwap || !swappable?.(i)) return image;
    return (
      <button type="button" onClick={() => onSwap(i)} aria-label={`Swap ${i.name} for another`} className="group relative block w-full rounded-md transition-transform active:scale-[0.97]">
        {image}
        <span aria-hidden className="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur-md transition-colors group-hover:bg-black/75">
          <ArrowLeftRight className="size-3.5" />
        </span>
      </button>
    );
  };

  return (
    <div className={cn("flex flex-col bg-studio", size === "lg" ? "gap-2 rounded-lg p-2" : "gap-1 rounded-lg p-1.5")}>
      <div className={cn("grid", gap, main.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
        {main.map((i, k) => (
          <motion.div key={i.id} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: k * 0.06, duration: 0.45, ease: EASE }}
            className={cn(main.length === 3 && k === 0 && "col-span-2")}>
            {tile(i, main.length === 3 && k === 0 ? "aspect-[2/1]" : "aspect-[4/5]")}
          </motion.div>
        ))}
      </div>
      {small.length > 0 && (
        <div className={cn("grid", gap, small.length <= 2 ? "grid-cols-2" : "grid-cols-3")}>
          {small.map((i, k) => (
            <motion.div key={i.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + k * 0.06, ease: EASE }}>
              {tile(i, "aspect-square")}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
