"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Plus, Shuffle } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Collage } from "@/components/outfits/collage";
import { OccasionBar } from "@/components/outfits/occasion-bar";
import { SuggestionCard } from "@/components/outfits/suggestion-card";
import { WeatherLine } from "@/components/outfits/weather-line";
import { ItemDetail } from "@/components/wardrobe/item-detail";
import { ItemImage } from "@/components/wardrobe/item-image";
import { today, useStore } from "@/lib/store";
import { defaultOccasion, useOccasions, useSuggestions } from "@/lib/use-suggestions";
import type { Item } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
const GOAL = 5;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Row({ title, items, urls, onOpen, href }: { title: string; items: Item[]; urls: Record<string, string>; onOpen: (id: string) => void; href?: string }) {
  if (!items.length) return null;
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-heading">{title}</h2>
        {href && <Link href={href} className="flex items-center gap-1 text-caption text-ink-2 hover:text-ink">See all <ArrowRight className="size-3.5" aria-hidden /></Link>}
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar md:-mx-10 md:px-10">
        {items.map((i) => (
          <button key={i.id} type="button" onClick={() => onOpen(i.id)} className="w-32 shrink-0 text-left transition-transform active:scale-[0.97] md:w-40">
            <ItemImage src={urls[i.imagePath]} alt={i.name} layoutId={`img-${i.id}`} fit="cover" className="aspect-[4/5] rounded-lg" />
            <p className="mt-2 truncate text-caption">{i.name}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { profile, items, urls, outfits } = useStore();
  const occasions = useOccasions();
  const [occasion, setOccasion] = useState(() => defaultOccasion(occasions, profile?.prefs.occasions ?? []));
  const [pick, setPick] = useState(0); // Shuffle steps through the ranked, already-diverse list
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);
  const { list, missing, weather, now } = useSuggestions(occasion, 1);
  const top = list.length ? list[pick % list.length] : undefined;
  const open = items.find((i) => i.id === openId);

  const recent = items.slice(0, 10);
  const forgotten = items
    .filter((i) => i.slot !== "accessory" && (!i.lastWorn || Date.parse(today()) - Date.parse(i.lastWorn) > 21 * 86_400_000) && Date.parse(today()) - Date.parse(i.createdAt) > 7 * 86_400_000)
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-safe md:px-10">
      <header className="pt-8 md:pt-12">
        <motion.p className="text-label uppercase text-ink-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </motion.p>
        <h1 className="mt-2 font-display text-[2rem] leading-[1.1] tracking-[-0.03em] md:text-display">
          {greeting()},<br /><em>{profile?.name}</em>.
        </h1>
        <div className="mt-2"><WeatherLine weather={weather} now={now} /></div>
      </header>

      {missing ? (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease: EASE }}
          className="mt-8 overflow-hidden rounded-xl bg-ink p-6 text-on-ink md:p-10">
          <p className="text-label uppercase opacity-60">Getting started</p>
          <h2 className="mt-3 max-w-sm font-display text-title">Add {Math.max(1, GOAL - items.length)} more {GOAL - items.length === 1 ? "piece" : "pieces"} and we&apos;ll start dressing you.</h2>
          <p className="mt-2 max-w-sm text-caption opacity-70">{missing}</p>
          <div className="mt-6 flex gap-1.5" aria-label={`${Math.min(items.length, GOAL)} of ${GOAL} added`}>
            {Array.from({ length: GOAL }, (_, i) => (
              <motion.span key={i} className="h-1 flex-1 rounded-full bg-on-ink/20" initial={false}>
                <motion.span className="block h-full rounded-full bg-on-ink" initial={{ width: 0 }} animate={{ width: i < items.length ? "100%" : 0 }} transition={{ delay: 0.3 + i * 0.08, ease: EASE }} />
              </motion.span>
            ))}
          </div>
          <Link href="/add" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-on-ink px-6 font-medium text-ink transition-transform active:scale-[0.98]">
            <Plus className="size-4" aria-hidden /> Add a piece
          </Link>
        </motion.section>
      ) : (
        <section className="mt-8">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><OccasionBar list={occasions} value={occasion} onChange={(o) => { setOccasion(o); setPick(0); }} /></div>
            <IconButton label="Another option" icon={<Shuffle className="size-[18px]" />} onClick={() => setPick((x) => x + 1)} disabled={list.length < 2} />
          </div>
          <div className="mt-5 md:grid md:grid-cols-[minmax(0,420px)_1fr] md:items-start md:gap-10">
            <AnimatePresence mode="wait">
              <motion.div key={top ? top.items.map((i) => i.id).join() : "none"} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
                {top ? <SuggestionCard s={top} occasion={occasion} index={pick % list.length} /> : <p className="rounded-xl bg-stone p-6 text-ink-2">Nothing fits {occasion.toLowerCase()} yet. Try another occasion.</p>}
              </motion.div>
            </AnimatePresence>
            <div className="mt-10 hidden md:mt-0 md:block">
              <p className="text-label uppercase text-ink-3">Why this look</p>
              <p className="mt-3 max-w-sm font-display text-heading text-ink-2">Picked from your {items.length} pieces for {occasion.toLowerCase()}, your taste in {profile?.prefs.styles.slice(0, 2).join(" and ").toLowerCase() || "style"}, and today&apos;s weather.</p>
              <Link href="/outfits" className="mt-6 inline-flex items-center gap-1.5 text-caption underline underline-offset-4">More options <ArrowRight className="size-3.5" aria-hidden /></Link>
            </div>
          </div>
        </section>
      )}

      <Row title="Rediscover" items={forgotten} urls={urls} onOpen={setOpenId} />
      <Row title="Recently added" items={recent} urls={urls} onOpen={setOpenId} href="/wardrobe" />

      {outfits.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-heading">Saved looks</h2>
            <Link href="/outfits" className="flex items-center gap-1 text-caption text-ink-2 hover:text-ink">All <ArrowRight className="size-3.5" aria-hidden /></Link>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar md:-mx-10 md:px-10">
            {outfits.slice(0, 8).map((o) => (
              <Link key={o.id} href="/outfits" className="w-40 shrink-0">
                <Collage items={items.filter((i) => o.itemIds.includes(i.id))} urls={urls} size="sm" />
                <p className="mt-2 truncate text-caption">{o.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>{open && <ItemDetail key={open.id} item={open} onClose={close} />}</AnimatePresence>
    </div>
  );
}
