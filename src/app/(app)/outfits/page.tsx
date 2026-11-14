"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Shuffle, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Builder } from "@/components/outfits/builder";
import { OccasionBar } from "@/components/outfits/occasion-bar";
import { SavedList } from "@/components/outfits/saved-list";
import { SuggestionCard } from "@/components/outfits/suggestion-card";
import { WeatherLine } from "@/components/outfits/weather-line";
import { useStore } from "@/lib/store";
import { defaultOccasion, useOccasions, useSuggestions } from "@/lib/use-suggestions";
import { cn } from "@/lib/cn";

const TABS = ["For you", "Saved", "Build"] as const;
type Tab = (typeof TABS)[number];

export default function OutfitsPage() {
  return <Suspense><Outfits /></Suspense>;
}

function Outfits() {
  const { items, profile, outfits } = useStore();
  const occasions = useOccasions();
  const [tab, setTab] = useState<Tab>("For you");
  const [occasion, setOccasion] = useState(() => defaultOccasion(occasions, profile?.prefs.occasions ?? []));
  const [seed, setSeed] = useState(1);
  const [withId, setWithId] = useState<string | null>(useSearchParams().get("with"));

  const { list, missing, gap, weather, now } = useSuggestions(occasion, seed, withId);
  const anchor = items.find((i) => i.id === withId);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-safe md:px-10">
      <header className="flex items-end justify-between pt-8 pb-5">
        <div>
          <h1 className="font-display text-title">Outfits</h1>
          <WeatherLine weather={weather} now={now} />
        </div>
      </header>

      <div role="tablist" className="mb-6 flex gap-6 border-b border-line">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)}
            className={cn("relative h-11 text-caption font-medium transition-colors", tab === t ? "text-ink" : "text-ink-3 hover:text-ink-2")}>
            {t}{t === "Saved" && outfits.length > 0 && <span className="ml-1.5 text-ink-3">{outfits.length}</span>}
            {tab === t && <motion.span layoutId="outfit-tab" className="absolute inset-x-0 -bottom-px h-0.5 bg-ink" />}
          </button>
        ))}
      </div>

      {tab === "For you" && (
        <>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><OccasionBar list={occasions} value={occasion} onChange={(o) => { setOccasion(o); setSeed(1); }} /></div>
            <IconButton label="Shuffle suggestions" icon={<Shuffle className="size-[18px]" />} onClick={() => setSeed((s) => s + 1)} disabled={!list.length} />
          </div>
          {anchor && (
            <p className="mt-4 flex items-center justify-between rounded-md bg-stone px-4 py-2.5 text-caption">
              Styling your {anchor.name.toLowerCase()}
              <button type="button" className="underline underline-offset-2" onClick={() => { setWithId(null); history.replaceState(null, "", "/outfits"); }}>Show all</button>
            </p>
          )}

          {missing ? (
            <EmptyState icon={<Sparkles className="size-6 stroke-[1.25]" />} title="Almost ready to style you" body={missing}
              action={<Link href="/add" className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-on-ink">Add a piece</Link>} />
          ) : list.length === 0 ? (
            <EmptyState icon={<Sparkles className="size-6 stroke-[1.25]" />} title={gap ? `Nothing for ${occasion.toLowerCase()} yet` : "Nothing fits this one yet"}
              body={gap ?? (anchor ? "We couldn't build a look around this piece. Add something to pair with it." : "Try another occasion, or add a few more pieces.")}
              action={gap ? <Link href="/add" className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-on-ink">Add a piece</Link> : undefined} />
          ) : (
            <motion.div key={`${occasion}-${seed}`} className="mt-6 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 no-scrollbar md:mx-0 md:grid md:grid-cols-2 md:gap-8 md:overflow-visible md:px-0 lg:grid-cols-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {list.map((s, i) => (
                <div key={s.items.map((x) => x.id).join()} className="w-[82vw] max-w-sm shrink-0 snap-center md:w-auto md:max-w-none">
                  <SuggestionCard s={s} occasion={occasion} index={i} />
                </div>
              ))}
            </motion.div>
          )}
        </>
      )}

      {tab === "Saved" && <SavedList onBuild={() => setTab("Build")} />}
      {tab === "Build" && (items.length ? <Builder occasions={occasions} onSaved={() => setTab("Saved")} /> : (
        <EmptyState icon={<Sparkles className="size-6 stroke-[1.25]" />} title="Nothing to build with" body="Add a few pieces first." action={<Link href="/add" className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-on-ink">Add a piece</Link>} />
      ))}
    </div>
  );
}
