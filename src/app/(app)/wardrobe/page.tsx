"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { ArrowDownUp, Shirt } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { SearchField } from "@/components/ui/search-field";
import { Swatch } from "@/components/ui/swatch";
import { ItemCard } from "@/components/wardrobe/item-card";
import { ItemDetail } from "@/components/wardrobe/item-detail";
import { colourById } from "@/lib/colours";
import { useStore } from "@/lib/store";
import { CATEGORIES, type Item } from "@/lib/types";
import { cn } from "@/lib/cn";

const SORTS = {
  "Recently added": (a: Item, b: Item) => b.createdAt.localeCompare(a.createdAt),
  "Most worn": (a: Item, b: Item) => b.wearCount - a.wearCount,
  "Least worn": (a: Item, b: Item) => a.wearCount - b.wearCount,
  "Name A–Z": (a: Item, b: Item) => a.name.localeCompare(b.name),
};
type Sort = keyof typeof SORTS;

export default function Wardrobe() {
  const { items, urls, updateItem } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [colour, setColour] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("Recently added");
  const [sortOpen, setSortOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);

  const coloursOwned = useMemo(() => [...new Set(items.map((i) => i.colours[0]))], [items]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter((i) => filter === "All" || (filter === "Favourites" ? i.favourite : i.category === filter))
      .filter((i) => !colour || i.colours.includes(colour))
      .filter((i) => !needle || [i.name, i.brand, i.category, i.pattern, ...i.colours.map((c) => colourById(c)?.label ?? "")].join(" ").toLowerCase().includes(needle))
      .sort(SORTS[sort]);
  }, [items, q, filter, colour, sort]);
  const open = items.find((i) => i.id === openId);
  const filters = ["All", "Favourites", ...CATEGORIES.filter((c) => items.some((i) => i.category === c))];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-safe md:px-10">
      <header className="flex items-end justify-between pt-8 pb-5">
        <div>
          <h1 className="font-display text-title">Wardrobe</h1>
          <p className="text-caption text-ink-3">{items.length} {items.length === 1 ? "piece" : "pieces"}</p>
        </div>
        <IconButton label={`Sort: ${sort}`} icon={<ArrowDownUp className="size-[18px]" />} onClick={() => setSortOpen(true)} />
      </header>

      {items.length === 0 ? (
        <EmptyState icon={<Shirt className="size-6 stroke-[1.25]" />} title="Your wardrobe is empty"
          body="Start with the pieces you wear most. One clear photo each is enough."
          action={<Link href="/add" className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-on-ink transition-opacity hover:opacity-90">Add first piece</Link>} />
      ) : (
        <>
          <div className="sticky top-0 z-20 -mx-4 bg-ivory/85 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md md:-mx-10 md:px-10">
            <SearchField value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ("")} placeholder="Search name, brand, colour" />
            <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 no-scrollbar md:-mx-10 md:px-10">
              {filters.map((f) => <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>{f}</Chip>)}
            </div>
            {coloursOwned.length > 1 && (
              <div className="-mx-4 mt-2 flex gap-1 overflow-x-auto px-4 no-scrollbar md:-mx-10 md:px-10" role="group" aria-label="Filter by colour">
                {coloursOwned.map((c) => (
                  <button key={c} type="button" aria-pressed={colour === c} aria-label={colourById(c)?.label} onClick={() => setColour(colour === c ? null : c)}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full">
                    <Swatch id={c} className={cn("size-6 transition-transform", colour === c ? "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-ivory" : "hover:scale-110")} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {shown.length === 0 ? (
            <EmptyState icon={<Shirt className="size-6 stroke-[1.25]" />} title="No matches" body="Nothing fits these filters."
              action={<button type="button" className="underline underline-offset-4" onClick={() => { setQ(""); setFilter("All"); setColour(null); }}>Clear filters</button>} />
          ) : (
            <div className="masonry mt-3">
              {shown.map((i, k) => (
                <ItemCard key={i.id} item={i} src={urls[i.imagePath]} index={k} onOpen={() => setOpenId(i.id)} onToggleFavourite={() => updateItem({ ...i, favourite: !i.favourite })} />
              ))}
            </div>
          )}
        </>
      )}

      <AnimatePresence>{open && <ItemDetail key={open.id} item={open} onClose={close} />}</AnimatePresence>

      <BottomSheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort by">
        <div role="radiogroup" className="flex flex-col pb-2">
          {(Object.keys(SORTS) as Sort[]).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={sort === s} onClick={() => { setSort(s); setSortOpen(false); }}
              className={cn("flex h-12 items-center justify-between rounded-md px-3 text-left transition-colors hover:bg-stone", sort === s && "font-medium")}>
              {s}{sort === s && <span className="size-2 rounded-full bg-ink" />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
