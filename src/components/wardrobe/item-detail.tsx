"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, CircleAlert, Heart, Loader2, Pencil, Shirt, Sparkles, Trash2, Undo2, WashingMachine } from "lucide-react";
import { analyse, needsReview } from "@/lib/analysis";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Swatch } from "@/components/ui/swatch";
import { toast } from "@/components/ui/toast";
import { colourById } from "@/lib/colours";
import { today, useStore } from "@/lib/store";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useAiRecheck } from "./ai-recheck";
import { ItemForm, type ItemFields } from "./item-form";
import { ItemImage } from "./item-image";

const EASE = [0.22, 1, 0.36, 1] as const;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-13 items-center justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-caption text-ink-3">{label}</dt>
      <dd className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-right text-caption text-ink">{children}</dd>
    </div>
  );
}

const worn = (i: Item) => (!i.lastWorn ? "Not logged yet" : i.lastWorn === today() ? "Today" : new Date(i.lastWorn).toLocaleDateString("en-IN", { day: "numeric", month: "short" }));

export function ItemDetail({ item, onClose }: { item: Item; onClose: () => void }) {
  const { urls, updateItem, deleteItem, markWorn, profile, setLaundry, token } = useStore();
  const [filling, setFilling] = useState(false);
  const inLaundry = !!profile?.prefs.laundry?.includes(item.id);
  const router = useRouter();
  const [editing, setEditing] = useState<ItemFields | null>(null);
  const [confirm, setConfirm] = useState(false);
  // The details before the last AI re-check, so it can be undone.
  const [previous, setPrevious] = useState<Item | null>(null);
  const recheck = useAiRecheck(item, (prev) => { setPrevious(prev); toast("Updated with the AI's details"); });

  // Back button / swipe-back closes the overlay instead of leaving the page.
  useEffect(() => {
    history.pushState({ styl: "item" }, "");
    const onPop = () => onClose();
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, [onClose]);
  const close = () => history.back();

  /** Read just the fit from the photo. Full re-checks go through useAiRecheck, which compares before applying. */
  async function detectFit() {
    const src = urls[item.imagePath];
    if (!src) return;
    setFilling(true);
    try {
      const blob = await (await fetch(src)).blob();
      const a = await analyse(blob, item.colours, await token());
      if (a.rejected) toast(a.rejected, "error");
      else if (a.source !== "ai") toast("The AI is busy. Try again in a minute, or edit the details yourself.", "error");
      else if (!a.fit) toast("Couldn't tell the fit from this photo. Set it in Edit.", "error");
      else { await updateItem({ ...item, fit: a.fit }); toast(`Fit: ${a.fit}`); }
    } catch { toast("Couldn't load the photo. Check your connection.", "error"); }
    finally { setFilling(false); }
  }

  return createPortal(
    <motion.div className="fixed inset-0 z-50 overflow-y-auto bg-ivory md:bg-scrim md:p-8" role="dialog" aria-modal aria-label={item.name}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="mx-auto min-h-full bg-ivory md:grid md:min-h-0 md:max-w-5xl md:grid-cols-[1.1fr_1fr] md:overflow-hidden md:rounded-xl md:border md:border-line md:shadow-float">
        <div className="relative md:sticky md:top-0">
          <ItemImage src={urls[item.imagePath]} alt={item.name} layoutId={`img-${item.id}`} className="rounded-b-xl md:h-full md:rounded-none" />
          <div className="absolute inset-x-0 top-0 flex justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <IconButton label="Back" tone="glass" icon={<ArrowLeft className="size-5" />} onClick={close} />
            <IconButton label={item.favourite ? "Remove from favourites" : "Add to favourites"} tone="glass" pressed={item.favourite}
              icon={<Heart className={cn("size-5", item.favourite && "fill-current")} />} onClick={() => updateItem({ ...item, favourite: !item.favourite })} />
          </div>
        </div>

        <motion.div className="px-5 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:p-10"
          // Opacity only: a transform here would make the pinned action bar position against this box, not the screen.
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.5, ease: EASE }}>
          <p className="flex items-center gap-2 text-label uppercase text-ink-3">{item.brand || item.category}
            {inLaundry && <span className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 normal-case tracking-normal text-ink-2"><WashingMachine className="size-3" aria-hidden /> In laundry</span>}
          </p>
          <h2 className="mt-2 font-display text-title">{item.name}</h2>

          {recheck.busy && (
            <p role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-caption text-ink-2">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Reading the photo with AI. Nothing changes until you confirm.
            </p>
          )}
          {previous && (
            <div role="status" className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface py-2 pr-2 pl-4 text-caption text-ink-2">
              Details updated by the AI.
              <Button variant="secondary" className="h-9 shrink-0 px-3 text-caption" onClick={async () => { await updateItem(previous); setPrevious(null); toast("Restored your previous details"); }}>
                <Undo2 className="size-4" aria-hidden /> Undo
              </Button>
            </div>
          )}

          {needsReview(item) && (
            <div role="status" className="mt-5 rounded-lg border border-line bg-surface p-4 text-caption text-ink-2">
              <p className="flex items-start gap-2"><CircleAlert className="mt-0.5 size-4 shrink-0 text-champagne" aria-hidden />Auto-fill didn&apos;t run when this was added, so its details may be wrong. That affects your outfits.</p>
              <Button variant="secondary" className="mt-3 h-9 px-4 text-caption" loading={recheck.busy} onClick={recheck.run}><Sparkles className="size-3.5" aria-hidden /> Auto-fill now</Button>
            </div>
          )}

          {/* Primary actions: pinned to the thumb zone on phones, inline on desktop. */}
          <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-line bg-ivory/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:static md:mt-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <Button variant="secondary" className="flex-1" disabled={item.lastWorn === today()} onClick={() => { markWorn([item.id]); toast("Logged as worn today"); }}>
              <Shirt className="size-4" aria-hidden /> {item.lastWorn === today() ? "Worn today" : "Wore it today"}
            </Button>
            <Button className="flex-1" onClick={() => { router.push(`/outfits?with=${item.id}`); }}><Sparkles className="size-4" aria-hidden /> Style it</Button>
          </div>

          <dl className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            <Fact label="Colours">{item.colours.map((c) => <span key={c} className="flex items-center gap-1.5"><Swatch id={c} />{colourById(c)?.label}</span>)}</Fact>
            <Fact label="Type">{item.category} · {item.pattern} · <span className="capitalize">{item.formality}</span></Fact>
            {["top", "bottom", "one-piece", "outer"].includes(item.slot) && (
              <Fact label="Fit">
                {item.fit ? <span className="capitalize">{item.fit}</span> : <>
                  <span className="text-ink-3">Not set</span>
                  <button type="button" disabled={filling} onClick={detectFit} className="flex items-center gap-1 text-caption font-medium underline underline-offset-2 disabled:opacity-50">
                    <Sparkles className="size-3.5" aria-hidden /> {filling ? "Detecting…" : "Detect"}
                  </button>
                </>}
              </Fact>
            )}
            <Fact label="Season"><span className="capitalize">{item.season === "all" ? "All year" : item.season}</span></Fact>
            {item.styles.length > 0 && <Fact label="Style">{item.styles.join(" · ")}</Fact>}
            <Fact label="Worn">{item.wearCount} {item.wearCount === 1 ? "time" : "times"} · last {worn(item)}</Fact>
            {item.notes && <Fact label="Notes"><span className="text-ink-2">{item.notes}</span></Fact>}
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" className="h-10 px-4 text-caption" aria-pressed={inLaundry} onClick={() => { setLaundry([item.id], !inLaundry); toast(inLaundry ? "Marked clean. Back in your outfits." : "In the laundry. We'll leave it out of outfits."); }}>
              <WashingMachine className="size-4" aria-hidden /> {inLaundry ? "Mark clean" : "In laundry"}
            </Button>
            <Button variant="secondary" className="h-10 px-4 text-caption" onClick={() => setEditing({ ...item })}><Pencil className="size-4" aria-hidden /> Edit</Button>
            <Button variant="danger" className="h-10 px-4 text-caption" onClick={() => setConfirm(true)}><Trash2 className="size-4" aria-hidden /> Delete</Button>
          </div>
        </motion.div>
      </div>

      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title="Edit details">
        {editing && (
          <div className="pb-2">
            <button type="button" disabled={recheck.busy} onClick={() => { setEditing(null); recheck.run(); }}
              className="mb-6 flex w-full items-center gap-3 rounded-lg border border-dashed border-ink-3/50 p-3.5 text-left transition-colors hover:border-ink-3 disabled:opacity-50">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone text-champagne"><Sparkles className="size-4" aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-caption font-medium">{recheck.busy ? "Reading the photo…" : "Re-check with AI"}</span>
                <span className="block text-[12px] text-ink-3">See what would change and how it affects your looks before anything is saved.</span>
              </span>
            </button>
            <ItemForm value={editing} onChange={setEditing} />
            <Button block size="lg" className="sticky bottom-0 mt-8" onClick={() => { updateItem({ ...item, ...editing, name: editing.name.trim() || item.name }); setEditing(null); toast("Saved"); }}>Save changes</Button>
          </div>
        )}
      </BottomSheet>

      {recheck.sheet}

      <BottomSheet open={confirm} onClose={() => setConfirm(false)} title="Delete this piece?">
        <p className="text-ink-2">{item.name} will be removed from your wardrobe and from any saved outfits. This can&apos;t be undone.</p>
        <div className="mt-6 flex gap-3 pb-2">
          <Button variant="secondary" block onClick={() => setConfirm(false)}>Keep it</Button>
          <Button variant="danger" block onClick={() => { setConfirm(false); deleteItem(item); close(); toast("Deleted"); }}>Delete</Button>
        </div>
      </BottomSheet>
    </motion.div>,
    document.body,
  );
}
