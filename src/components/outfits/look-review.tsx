"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Bookmark, Check, Layers, Shirt } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { today, useStore } from "@/lib/store";
import { OCCASIONS, type Occasion, type Slot } from "@/lib/types";
import { useLookRater, useOccasions } from "@/lib/use-suggestions";
import { Collage } from "./collage";
import { LookInsights } from "./look-insights";
import { LookScore } from "./look-score";
import { ScoreBreakdown } from "./score-breakdown";

const isOccasion = (o: string | null): o is Occasion => !!o && (OCCASIONS as readonly string[]).includes(o);

/** Review of a look the user built: score, best occasion, what works, what to watch, one fix, then save or wear. */
export function LookReview() {
  const params = useSearchParams();
  const router = useRouter();
  const { items, urls, saveOutfit, markWorn } = useStore();
  const occasions = useOccasions();
  const { rateLook } = useLookRater();
  const [ids, setIds] = useState<string[]>(() => params.get("items")?.split(",").filter(Boolean) ?? []);
  const [occasion, setOccasion] = useState<Occasion>(() => { const o = params.get("occasion"); return isOccasion(o) ? o : occasions[0]; });
  const [undo, setUndo] = useState<string[] | null>(null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const look = useMemo(() => ids.map((id) => items.find((i) => i.id === id)).filter((i) => !!i), [ids, items]);
  const has = (s: Slot) => look.some((i) => i.slot === s);
  const wearable = has("one-piece") || (has("top") && has("bottom"));
  const r = useMemo(() => (wearable ? rateLook(look, occasion) : null), [wearable, rateLook, look, occasion]);
  const fits = useMemo(() => (wearable ? occasions.map((o) => ({ occasion: o, rating: rateLook(look, o).rating })) : []), [wearable, occasions, rateLook, look]);

  // Keep the URL in step so refresh, share and Back return to this exact look.
  useEffect(() => { history.replaceState(null, "", `/look?items=${ids.join(",")}&occasion=${encodeURIComponent(occasion)}`); }, [ids, occasion]);

  const edit = () => router.push(`/outfits?tab=build&items=${ids.join(",")}`);
  const applyTip = () => {
    const sw = r?.tipSwap;
    if (!sw) return;
    setUndo(ids);
    setIds(sw.from ? ids.map((id) => (id === sw.from ? sw.to : id)) : [...ids, sw.to]);
    toast(`Now wearing your ${items.find((i) => i.id === sw.to)?.name.toLowerCase()}`);
  };
  const wornToday = look.length > 0 && look.every((i) => i.lastWorn === today());

  if (!wearable || !r) {
    return (
      <EmptyState icon={<Layers className="size-6 stroke-[1.25]" />} title="This look isn't complete"
        body="Pick a top and a bottom, or a full outfit, to get a score." action={<Button onClick={edit}>Back to builder</Button>} />
    );
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-16 items-center gap-2 bg-ivory/85 px-4 pt-safe backdrop-blur-xl md:px-10">
        <IconButton label="Edit look" tone="filled" icon={<ArrowLeft className="size-5" />} onClick={edit} />
        <h1 className="font-display text-heading">Your look</h1>
        <span className="ml-auto text-caption text-ink-3">{look.length} pieces</span>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-2 pb-[calc(7rem+env(safe-area-inset-bottom))] md:grid md:grid-cols-[minmax(0,420px)_1fr] md:gap-10 md:px-10">
        <div className="md:sticky md:top-20 md:self-start">
          <Collage items={look} urls={urls} />
        </div>
        <div className="mt-6 flex flex-col gap-6 md:mt-0">
          <LookScore rating={r.rating} occasion={occasion} fits={fits} onOccasion={(o) => { setOccasion(o); setUndo(null); }} reasons={r.reasons.length} cautions={r.cautions.length} />
          <LookInsights reasons={r.reasons} cautions={r.cautions} tip={r.tip} onApplyTip={r.tipSwap ? applyTip : undefined}
            onUndo={undo ? () => { setIds(undo); setUndo(null); } : undefined} />
          <ScoreBreakdown rating={r.rating} factors={r.factors} defaultOpen note="Scored with the same stylist rules as your daily suggestions." />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-md gap-2">
          <Button variant="secondary" className="flex-1" disabled={wornToday} onClick={() => { markWorn(ids); toast("Logged as worn today"); }}>
            {wornToday ? <><Check className="size-4" aria-hidden /> Worn today</> : <><Shirt className="size-4" aria-hidden /> Wear today</>}
          </Button>
          <Button className="flex-1" onClick={() => { setName(`${occasion} look`); setNaming(true); }}><Bookmark className="size-4" aria-hidden /> Save look</Button>
        </div>
      </div>

      <BottomSheet open={naming} onClose={() => setNaming(false)} title="Save this look">
        <form className="flex flex-col gap-5 pb-2" onSubmit={(e) => {
          e.preventDefault();
          saveOutfit({ name: name.trim() || `${occasion} look`, itemIds: ids, occasion });
          toast("Saved to your outfits");
          router.push("/outfits?tab=saved");
        }}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <p className="-mt-2 text-caption text-ink-3">Saved for {occasion.toLowerCase()}. Looks you save also teach your daily suggestions.</p>
          <Button type="submit" size="lg" block>Save</Button>
        </form>
      </BottomSheet>
    </>
  );
}
