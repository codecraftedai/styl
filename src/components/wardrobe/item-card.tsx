"use client";

import { CircleAlert, Heart, WashingMachine } from "lucide-react";
import { motion } from "motion/react";
import { needsReview } from "@/lib/analysis";
import { cn } from "@/lib/cn";
import { Swatch } from "@/components/ui/swatch";
import type { Item } from "@/lib/types";
import { ItemImage } from "./item-image";

type ItemCardProps = { item: Item; src?: string; onOpen: () => void; onToggleFavourite: () => void; index?: number; inLaundry?: boolean };

const badge = "absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md";

/** Uniform 4:5 product tile: photo on the studio backdrop, heart always reachable top-right. */
export function ItemCard({ item, src, onOpen, onToggleFavourite, index = 0, inLaundry }: ItemCardProps) {
  return (
    <motion.article className="group relative"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: Math.min(index, 12) * 0.035, ease: [0.22, 1, 0.36, 1] }}>
      <button type="button" onClick={onOpen} className="block w-full rounded-lg text-left">
        <span className="relative block">
          <ItemImage src={src} alt={item.name} layoutId={`img-${item.id}`} fit="cover"
            className={cn("aspect-[4/5] rounded-lg transition-[transform,opacity] duration-500 ease-[var(--ease-lux)] group-hover:scale-[1.01] group-active:scale-[0.98]", inLaundry && "opacity-40")} />
          {needsReview(item) && !inLaundry && <span className={badge}><CircleAlert className="size-3" aria-hidden /> Check details</span>}
          {inLaundry && <span className={badge}><WashingMachine className="size-3" aria-hidden /> In laundry</span>}
        </span>
        <span className="mt-3 flex items-start gap-2 px-1">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-caption font-medium text-ink">{item.name}</span>
            <span className="mt-0.5 block truncate text-[12px] text-ink-3">{item.brand || item.category}</span>
          </span>
          <span className="mt-1 flex -space-x-1">{item.colours.slice(0, 2).map((c) => <Swatch key={c} id={c} className="size-3 ring-2 ring-ivory" />)}</span>
        </span>
      </button>
      <button type="button" onClick={onToggleFavourite} aria-pressed={item.favourite}
        aria-label={item.favourite ? `Remove ${item.name} from favourites` : `Add ${item.name} to favourites`}
        className="absolute top-2 right-2 flex size-10 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-md transition-[background-color,transform] hover:bg-black/65 active:scale-75">
        <motion.span key={String(item.favourite)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 15 }}>
          <Heart className={cn("size-[17px]", item.favourite ? "fill-white" : "fill-transparent")} />
        </motion.span>
      </button>
    </motion.article>
  );
}

export function ItemCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton aspect-[4/5] rounded-lg" />
      <div className="skeleton mt-3 h-3 w-2/3 rounded-sm" />
    </div>
  );
}
