"use client";

import { Heart } from "lucide-react";
import { motion } from "motion/react";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Swatch } from "@/components/ui/swatch";
import { ItemImage } from "./item-image";

type ItemCardProps = { item: Item; src?: string; onOpen: () => void; onToggleFavourite: () => void; index?: number };

export function ItemCard({ item, src, onOpen, onToggleFavourite, index = 0 }: ItemCardProps) {
  return (
    <motion.article className="group relative"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: Math.min(index, 12) * 0.035, ease: [0.22, 1, 0.36, 1] }}>
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <ItemImage src={src} alt={item.name} layoutId={`img-${item.id}`} className="rounded-lg transition-transform duration-500 ease-[var(--ease-lux)] group-hover:-translate-y-0.5 group-active:scale-[0.98]" />
        <div className="mt-2.5 flex items-start gap-2 px-0.5">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-caption text-ink">{item.name}</h3>
            <p className="mt-0.5 truncate text-[11px] text-ink-3">{item.brand || item.category}</p>
          </div>
          <span className="mt-0.5 flex -space-x-1">{item.colours.slice(0, 2).map((c) => <Swatch key={c} id={c} className="size-3 ring-2 ring-ivory" />)}</span>
        </div>
      </button>
      <button type="button" onClick={onToggleFavourite} aria-pressed={item.favourite}
        aria-label={item.favourite ? `Remove ${item.name} from favourites` : `Add ${item.name} to favourites`}
        className={cn("absolute top-1.5 right-1.5 flex size-10 items-center justify-center rounded-full bg-surface/70 backdrop-blur transition-[opacity,transform] active:scale-75",
          item.favourite ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100")}>
        <motion.span key={String(item.favourite)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 15 }}>
          <Heart className={cn("size-[17px]", item.favourite ? "fill-ink" : "fill-transparent")} />
        </motion.span>
      </button>
    </motion.article>
  );
}

export function ItemCardSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div aria-hidden>
      <div className={cn("skeleton rounded-lg", tall ? "aspect-[3/4]" : "aspect-square")} />
      <div className="skeleton mt-2.5 h-3 w-2/3 rounded-sm" />
    </div>
  );
}
