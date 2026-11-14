"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, CircleAlert, Heart, Pencil, Shirt, Sparkles, Trash2, WashingMachine } from "lucide-react";
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
import { ItemForm, type ItemFields } from "./item-form";
import { ItemImage } from "./item-image";

const EASE = [0.22, 1, 0.36, 1] as const;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line py-3.5">
      <dt className="text-label uppercase text-ink-3">{label}</dt>
      <dd className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">{children}</dd>
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

  // Back button / swipe-back closes the overlay instead of leaving the page.
  useEffect(() => {
    history.pushState({ styl: "item" }, "");
    const onPop = () => onClose();
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, [onClose]);
  const close = () => history.back();

  /** Re-read the saved photo with the AI and replace the guessed details (brand and notes are kept). */
  async function autofill() {
    const src = urls[item.imagePath];
    if (!src) return;
    setFilling(true);
    try {
      const blob = await (await fetch(src)).blob();
      const a = await analyse(blob, item.colours, await token());
      if (a.rejected) toast(a.rejected, "error");
      else if (a.source !== "ai") toast("The AI is busy. Try again in a minute, or edit the details yourself.", "error");
      else { await updateItem({ ...item, name: a.name, category: a.category, slot: a.slot, colours: a.colours, pattern: a.pattern, formality: a.formality, season: a.season, styles: a.styles }); toast(`Updated: ${a.name}`); }
    } catch { toast("Couldn't load the photo. Check your connection.", "error"); }
    finally { setFilling(false); }
  }

  return createPortal(
    <motion.div className="fixed inset-0 z-50 overflow-y-auto bg-ivory md:bg-scrim md:p-8" role="dialog" aria-modal aria-label={item.name}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="mx-auto min-h-full bg-ivory md:grid md:min-h-0 md:max-w-5xl md:grid-cols-[1.1fr_1fr] md:overflow-hidden md:rounded-xl md:shadow-float">
        <div className="relative md:sticky md:top-0">
          <ItemImage src={urls[item.imagePath]} alt={item.name} layoutId={`img-${item.id}`} className="md:h-full" />
          <div className="absolute inset-x-0 top-0 flex justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <IconButton label="Back" tone="glass" icon={<ArrowLeft className="size-5" />} onClick={close} />
            <IconButton label={item.favourite ? "Remove from favourites" : "Add to favourites"} tone="glass" pressed={item.favourite}
              icon={<Heart className={cn("size-5", item.favourite && "fill-ink")} />} onClick={() => updateItem({ ...item, favourite: !item.favourite })} />
          </div>
        </div>

        <motion.div className="px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] md:p-10"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5, ease: EASE }}>
          <p className="flex items-center gap-2 text-label uppercase text-champagne-ink">{item.brand || item.category}
            {inLaundry && <span className="flex items-center gap-1 rounded-full bg-stone px-2 py-0.5 normal-case tracking-normal text-ink-2"><WashingMachine className="size-3" aria-hidden /> In laundry</span>}
          </p>
          <h2 className="mt-2 font-display text-title">{item.name}</h2>

          {needsReview(item) && (
            <div role="status" className="mt-5 rounded-md bg-stone px-4 py-3 text-caption text-ink-2">
              <p className="flex items-start gap-2"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />Auto-fill didn&apos;t run when this was added, so its details may be wrong. That affects your outfits.</p>
              <Button variant="secondary" className="mt-3 h-9 px-4 text-caption" loading={filling} onClick={autofill}><Sparkles className="size-3.5" aria-hidden /> Auto-fill now</Button>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button onClick={() => { router.push(`/outfits?with=${item.id}`); }}><Sparkles className="size-4" aria-hidden /> Style it</Button>
            <Button variant="secondary" disabled={item.lastWorn === today()} onClick={() => { markWorn([item.id]); toast("Logged as worn today"); }}>
              <Shirt className="size-4" aria-hidden /> {item.lastWorn === today() ? "Worn today" : "Wore it today"}
            </Button>
          </div>

          <dl className="mt-8">
            <Fact label="Colours">{item.colours.map((c) => <span key={c} className="flex items-center gap-1.5"><Swatch id={c} />{colourById(c)?.label}</span>)}</Fact>
            <Fact label="Type">{item.category} · {item.pattern} · <span className="capitalize">{item.formality}</span></Fact>
            <Fact label="Season"><span className="capitalize">{item.season === "all" ? "All year" : item.season}</span></Fact>
            {item.styles.length > 0 && <Fact label="Style">{item.styles.join(" · ")}</Fact>}
            <Fact label="Worn">{item.wearCount} {item.wearCount === 1 ? "time" : "times"} · last {worn(item)}</Fact>
            {item.notes && <Fact label="Notes"><span className="text-ink-2">{item.notes}</span></Fact>}
          </dl>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-6">
            <Button variant="ghost" aria-pressed={inLaundry} onClick={() => { setLaundry([item.id], !inLaundry); toast(inLaundry ? "Marked clean. Back in your outfits." : "In the laundry. We'll leave it out of outfits."); }}>
              <WashingMachine className="size-4" aria-hidden /> {inLaundry ? "Mark clean" : "In laundry"}
            </Button>
            <Button variant="ghost" onClick={() => setEditing({ ...item })}><Pencil className="size-4" aria-hidden /> Edit</Button>
            <Button variant="ghost" className="text-danger" onClick={() => setConfirm(true)}><Trash2 className="size-4" aria-hidden /> Delete</Button>
          </div>
        </motion.div>
      </div>

      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title="Edit details">
        {editing && (
          <div className="pb-2">
            <ItemForm value={editing} onChange={setEditing} />
            <Button block size="lg" className="sticky bottom-0 mt-8" onClick={() => { updateItem({ ...item, ...editing, name: editing.name.trim() || item.name }); setEditing(null); toast("Saved"); }}>Save changes</Button>
          </div>
        )}
      </BottomSheet>

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
