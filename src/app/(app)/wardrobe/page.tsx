"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { ArrowDownUp, Check, Heart, Search, Shirt, SlidersHorizontal, WashingMachine, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { SearchField } from "@/components/ui/search-field";
import { Shortcut } from "@/components/ui/shortcut";
import { Swatch } from "@/components/ui/swatch";
import { toast } from "@/components/ui/toast";
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
  const { items, urls, updateItem, profile, setLaundry } = useStore();
  const laundry = useMemo(() => profile?.prefs.laundry ?? [], [profile]);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [category, setCategory] = useState("All");
  const [liked, setLiked] = useState(false);
  const [washing, setWashing] = useState(false);
  const [colour, setColour] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("Recently added");
  const [sheet, setSheet] = useState<"sort" | "filter" | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);

  const coloursOwned = useMemo(() => [...new Set(items.map((i) => i.colours[0]))], [items]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter((i) => category === "All" || i.category === category)
      .filter((i) => (!liked || i.favourite) && (!washing || laundry.includes(i.id)) && (!colour || i.colours.includes(colour)))
      .filter((i) => !needle || [i.name, i.brand, i.category, i.pattern, ...i.colours.map((c) => colourById(c)?.label ?? "")].join(" ").toLowerCase().includes(needle))
      .sort(SORTS[sort]);
  }, [items, q, category, liked, washing, colour, sort, laundry]);
  const open = items.find((i) => i.id === openId);
  const categories = ["All", ...CATEGORIES.filter((c) => items.some((i) => i.category === c))];
  const reset = () => { setQ(""); setCategory("All"); setLiked(false); setWashing(false); setColour(null); };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-safe md:px-10">
      <header className="flex items-center justify-between gap-3 pt-8 pb-6">
        <div>
          <h1 className="font-display text-title">Wardrobe</h1>
          <p className="mt-1 text-caption text-ink-3">{items.length} {items.length === 1 ? "piece" : "pieces"}</p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && <IconButton label={searching ? "Close search" : "Search wardrobe"} tone="filled" pressed={searching}
            icon={searching ? <X className="size-[18px]" /> : <Search className="size-[18px]" />} onClick={() => { setSearching((s) => !s); setQ(""); }} />}
          <Link href="/profile" aria-label="Profile" className="flex size-11 items-center justify-center rounded-full bg-ink font-display text-heading text-on-ink transition-transform active:scale-95">
            {profile?.name?.[0]?.toUpperCase() ?? "S"}
          </Link>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState icon={<Shirt className="size-6 stroke-[1.25]" />} title="Your wardrobe is empty"
          body="Start with the pieces you wear most. One clear photo each is enough."
          action={<Link href="/add" className="inline-flex h-12 items-center rounded-full bg-ink px-6 font-semibold text-on-ink transition-colors hover:bg-ink/90">Add first piece</Link>} />
      ) : (
        <>
          {searching && <div className="mb-5 animate-fade-up"><SearchField autoFocus value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ("")} placeholder="Search name, brand, colour" /></div>}

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar md:-mx-10 md:px-10">
            <Shortcut icon={<ArrowDownUp className="size-[18px]" />} label="Sort" onClick={() => setSheet("sort")} />
            <Shortcut icon={<SlidersHorizontal className="size-[18px]" />} label="Colour" active={!!colour} count={colour ? 1 : 0} onClick={() => setSheet("filter")} disabled={coloursOwned.length < 2} />
            <Shortcut icon={<Heart className={cn("size-[18px]", liked && "fill-current")} />} label="Liked" active={liked} aria-pressed={liked} onClick={() => setLiked((v) => !v)} />
            {laundry.length > 0 && <Shortcut icon={<WashingMachine className="size-[18px]" />} label="Laundry" active={washing} count={laundry.length} aria-pressed={washing} onClick={() => setWashing((v) => !v)} />}
          </div>

          {/* Only the category pills stick: search and shortcuts scroll away so the grid keeps the screen. */}
          <div className="sticky top-0 z-20 -mx-4 mt-4 bg-ivory/85 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl md:-mx-10 md:px-10">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar md:-mx-10 md:px-10">
              {categories.map((c) => <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>{c}</Chip>)}
            </div>
          </div>

          {washing && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-caption">
              <span className="text-ink-2">{laundry.length} {laundry.length === 1 ? "piece is" : "pieces are"} left out of outfits until clean.</span>
              <Button variant="secondary" className="h-9 shrink-0 px-4 text-caption" onClick={() => { setLaundry(laundry, false); setWashing(false); toast("All marked clean"); }}>Laundry done</Button>
            </div>
          )}

          {shown.length === 0 ? (
            <EmptyState icon={<Shirt className="size-6 stroke-[1.25]" />} title="No matches" body="Nothing fits these filters."
              action={<Button variant="secondary" onClick={reset}>Clear filters</Button>} />
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 xl:grid-cols-4">
              {shown.map((i, k) => (
                <ItemCard key={i.id} item={i} src={urls[i.imagePath]} index={k} inLaundry={laundry.includes(i.id)} onOpen={() => setOpenId(i.id)} onToggleFavourite={() => updateItem({ ...i, favourite: !i.favourite })} />
              ))}
            </div>
          )}
        </>
      )}

      <AnimatePresence>{open && <ItemDetail key={open.id} item={open} onClose={close} />}</AnimatePresence>

      <BottomSheet open={sheet === "sort"} onClose={() => setSheet(null)} title="Sort by">
        <div role="radiogroup" className="flex flex-col gap-1 pb-2">
          {(Object.keys(SORTS) as Sort[]).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={sort === s} onClick={() => { setSort(s); setSheet(null); }}
              className={cn("flex h-13 items-center justify-between rounded-md px-4 text-left transition-colors hover:bg-stone", sort === s ? "bg-stone font-medium text-ink" : "text-ink-2")}>
              {s}{sort === s && <Check className="size-4" aria-hidden />}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "filter"} onClose={() => setSheet(null)} title="Filter by colour">
        <div role="group" aria-label="Colour" className="grid grid-cols-4 gap-2 pb-2 sm:grid-cols-5">
          {coloursOwned.map((c) => (
            <button key={c} type="button" aria-pressed={colour === c} onClick={() => { setColour(colour === c ? null : c); setSheet(null); }}
              className={cn("flex flex-col items-center gap-2 rounded-md border py-3 text-[12px] transition-colors", colour === c ? "border-ink bg-stone text-ink" : "border-transparent text-ink-2 hover:bg-stone")}>
              <Swatch id={c} className="size-8" />{colourById(c)?.label}
            </button>
          ))}
        </div>
        {colour && <Button variant="ghost" block className="mb-2" onClick={() => { setColour(null); setSheet(null); }}>Show all colours</Button>}
      </BottomSheet>
    </div>
  );
}
