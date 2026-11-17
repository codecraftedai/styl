"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CircleAlert, Plus, Sparkles } from "lucide-react";
import { wardrobeGaps } from "@/lib/gaps";
import { needsReview } from "@/lib/analysis";
import { EMPTY_PREFS } from "@/lib/types";
import { Collage } from "@/components/outfits/collage";
import { OccasionBar } from "@/components/outfits/occasion-bar";
import { SuggestionCard } from "@/components/outfits/suggestion-card";
import { WeatherLine } from "@/components/outfits/weather-line";
import { WinterNudge } from "@/components/outfits/winter-nudge";
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

function SectionHead({ title, href, label = "See all" }: { title: string; href?: string; label?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-[1.375rem] tracking-tight">{title}</h2>
      {href && <Link href={href} className="flex h-9 items-center gap-1 rounded-full px-3 text-caption font-medium text-ink-2 transition-colors hover:bg-stone hover:text-ink">{label} <ArrowRight className="size-3.5" aria-hidden /></Link>}
    </div>
  );
}

function Row({ title, items, urls, onOpen, href }: { title: string; items: Item[]; urls: Record<string, string>; onOpen: (id: string) => void; href?: string }) {
  if (!items.length) return null;
  return (
    <section className="mt-12">
      <SectionHead title={title} href={href} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar md:-mx-10 md:px-10">
        {items.map((i) => (
          <button key={i.id} type="button" onClick={() => onOpen(i.id)} className="w-36 shrink-0 rounded-lg text-left transition-transform active:scale-[0.97] md:w-44">
            <ItemImage src={urls[i.imagePath]} alt={i.name} layoutId={`img-${i.id}`} fit="cover" className="aspect-[4/5] rounded-lg" />
            <p className="mt-2.5 truncate px-1 text-caption font-medium">{i.name}</p>
            <p className="truncate px-1 text-[12px] text-ink-3">{i.brand || i.category}</p>
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
  // Shuffle steps through the ranked, already-diverse list. The day picks which of the top three opens first,
  // so the morning look changes even for someone who never taps "Wear this".
  const [pick, setPick] = useState(() => Math.floor(Date.parse(today()) / 86_400_000) % 3);
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);
  const { list, swapper, missing, gap, unchecked, weather, now, season, wet } = useSuggestions(occasion, 1);
  const top = list.length ? list[pick % list.length] : undefined;
  const open = items.find((i) => i.id === openId);
  // Staples that would unlock the most looks; only meaningful once there's a small wardrobe to build on.
  const gaps = useMemo(
    () => (items.length >= 5 ? wardrobeGaps(items.filter((i) => !needsReview(i)), { ...EMPTY_PREFS, ...profile?.prefs }, today()) : []),
    [items, profile],
  );

  const recent = items.slice(0, 10);
  const forgotten = items
    .filter((i) => i.slot !== "accessory" && (!i.lastWorn || Date.parse(today()) - Date.parse(i.lastWorn) > 21 * 86_400_000) && Date.parse(today()) - Date.parse(i.createdAt) > 7 * 86_400_000)
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-safe md:px-10">
      <header className="pt-8 md:pt-12">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <motion.p className="text-label uppercase text-ink-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{greeting()}</motion.p>
            <h1 className="mt-1.5 truncate font-display text-title md:text-display">{profile?.name}.</h1>
          </div>
          <Link href="/profile" aria-label="Profile" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[1.25rem] text-on-ink transition-transform active:scale-95 md:hidden">
            {profile?.name?.[0]?.toUpperCase() ?? "S"}
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center rounded-full border border-line px-3.5 text-caption text-ink-2">
            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </span>
          <Link href="/profile?edit=season" aria-label="Change season" className="inline-flex h-9 items-center rounded-full border border-line px-3.5 transition-colors hover:border-ink-3"><WeatherLine weather={weather} now={now} season={season} wet={wet} /></Link>
        </div>
        <WinterNudge />
        {unchecked > 0 && (
          <Link href="/wardrobe" className="mt-4 flex items-center gap-3 rounded-lg border border-line bg-surface p-3.5 text-caption text-ink-2 transition-colors hover:border-ink-3 hover:text-ink">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone text-champagne"><CircleAlert className="size-4" aria-hidden /></span>
            <span className="flex-1">{unchecked} {unchecked === 1 ? "piece needs" : "pieces need"} a quick check before we use {unchecked === 1 ? "it" : "them"}</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        )}
      </header>

      {missing ? (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease: EASE }}
          className="mt-8 overflow-hidden rounded-xl bg-ink p-6 text-on-ink md:p-10">
          <p className="text-label uppercase opacity-60">Getting started</p>
          <h2 className="mt-3 max-w-sm font-display text-title text-on-ink">Add {Math.max(1, GOAL - items.length)} more {GOAL - items.length === 1 ? "piece" : "pieces"} and we&apos;ll start dressing you.</h2>
          <p className="mt-2 max-w-sm text-caption opacity-70">{missing}</p>
          <div className="mt-6 flex gap-1.5" aria-label={`${Math.min(items.length, GOAL)} of ${GOAL} added`}>
            {Array.from({ length: GOAL }, (_, i) => (
              <motion.span key={i} className="h-1 flex-1 rounded-full bg-on-ink/20" initial={false}>
                <motion.span className="block h-full rounded-full bg-on-ink" initial={{ width: 0 }} animate={{ width: i < items.length ? "100%" : 0 }} transition={{ delay: 0.3 + i * 0.08, ease: EASE }} />
              </motion.span>
            ))}
          </div>
          <Link href="/add" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-on-ink px-6 font-semibold text-ink transition-[transform,opacity] hover:opacity-90 active:scale-[0.98]">
            <Plus className="size-4" aria-hidden /> Add a piece
          </Link>
        </motion.section>
      ) : (
        <section className="mt-8">
          <SectionHead title="Today's look" href="/outfits" label="More" />
          <OccasionBar list={occasions} value={occasion} onChange={(o) => { setOccasion(o); setPick(0); }} />
          <div className="mt-5 md:grid md:grid-cols-[minmax(0,420px)_1fr] md:items-start md:gap-10">
            <AnimatePresence mode="wait">
              <motion.div key={top ? top.items.map((i) => i.id).join() : "none"} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
                {top ? <SuggestionCard s={top} occasion={occasion} index={pick % list.length} swapper={swapper} meta={list.length > 1 ? `${(pick % list.length) + 1} of ${list.length}` : undefined} onNext={list.length > 1 ? () => setPick((x) => x + 1) : undefined} /> : <p className="rounded-xl border border-line bg-surface p-6 text-ink-2">{gap ?? `Nothing fits ${occasion.toLowerCase()} yet. Try another occasion.`}</p>}
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
          <SectionHead title="Saved looks" href="/outfits?tab=saved" />
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar md:-mx-10 md:px-10">
            {outfits.slice(0, 8).map((o) => (
              <Link key={o.id} href="/outfits?tab=saved" className="w-40 shrink-0 rounded-lg">
                <Collage items={items.filter((i) => o.itemIds.includes(i.id))} urls={urls} size="sm" />
                <p className="mt-2.5 truncate px-1 text-caption font-medium">{o.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {gaps.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-[1.375rem] tracking-tight">Worth adding</h2>
          <p className="mt-1 text-caption text-ink-3">What would unlock the most new looks from what you already own.</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {gaps.map((g, k) => (
              <motion.li key={g.key} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.06, ease: EASE }}
                className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone"><Sparkles className="size-4 text-champagne" aria-hidden /></span>
                <span><span className="block font-medium">{g.name}</span><span className="mt-0.5 block text-caption text-ink-3">{g.reason}</span></span>
              </motion.li>
            ))}
          </ul>
        </section>
      )}

      <AnimatePresence>{open && <ItemDetail key={open.id} item={open} onClose={close} />}</AnimatePresence>
    </div>
  );
}
