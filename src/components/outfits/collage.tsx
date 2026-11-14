"use client";

import { motion } from "motion/react";
import type { Item, Slot } from "@/lib/types";
import { cn } from "@/lib/cn";
import { ItemImage } from "@/components/wardrobe/item-image";

const ORDER: Slot[] = ["outer", "top", "one-piece", "bottom", "shoes", "bag", "accessory"];
const MAIN: Slot[] = ["outer", "top", "one-piece", "bottom"];

/** Flat-lay board: clothes large on top, shoes and accessories in a smaller row, all on the studio backdrop. */
export function Collage({ items, urls, size = "lg" }: { items: Item[]; urls: Record<string, string>; size?: "lg" | "sm" }) {
  const sorted = [...items].sort((a, b) => ORDER.indexOf(a.slot) - ORDER.indexOf(b.slot));
  const main = sorted.filter((i) => MAIN.includes(i.slot));
  const small = sorted.filter((i) => !MAIN.includes(i.slot));
  const gap = size === "lg" ? "gap-2" : "gap-1";
  return (
    <div className={cn("flex flex-col rounded-xl bg-studio", size === "lg" ? "gap-2 p-3" : "gap-1 p-1.5")}>
      <div className={cn("grid", gap, main.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
        {main.map((i, k) => (
          <motion.div key={i.id} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: k * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className={cn(main.length === 3 && k === 0 && "col-span-2")}>
            <ItemImage src={urls[i.imagePath]} alt={i.name} fit="cover" className={cn("rounded-lg", main.length === 3 && k === 0 ? "aspect-[2/1]" : "aspect-[4/5]")} />
          </motion.div>
        ))}
      </div>
      {small.length > 0 && (
        <div className={cn("grid", gap, small.length === 1 ? "grid-cols-2" : small.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
          {small.map((i, k) => (
            <motion.div key={i.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + k * 0.06, ease: [0.22, 1, 0.36, 1] }}>
              <ItemImage src={urls[i.imagePath]} alt={i.name} fit="cover" className="aspect-square rounded-lg" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
