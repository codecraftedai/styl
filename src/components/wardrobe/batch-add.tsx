"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, CircleAlert, Loader2, Sparkles, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Swatch } from "@/components/ui/swatch";
import { toast } from "@/components/ui/toast";
import { analyse } from "@/lib/analysis";
import { compress, dominantColours, measureLightness } from "@/lib/image";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { ItemForm, type ItemFields } from "./item-form";

type Status = "waiting" | "reading" | "ready" | "manual" | "rejected";
type Entry = { key: string; preview: string | null; photo: Blob | null; status: Status; fields: ItemFields | null; issue: string | null };

const EASE = [0.22, 1, 0.36, 1] as const;
const blank = (colours: string[], lightness: number | null): ItemFields => ({ name: "New piece", category: "Tops", slot: "top", colours, pattern: "Solid", formality: "casual", season: "all", styles: [], brand: "", notes: "", lightness, fit: null });
const saveable = (e: Entry) => (e.status === "ready" || e.status === "manual") && !!e.photo && !!e.fields;

/**
 * Several photos at once: every photo gets a card; the AI reads them one at a time
 * (free tiers limit requests per minute), and the user can check any card while the rest are read.
 */
export function BatchAdd({ files, onReset }: { files: File[]; onReset: () => void }) {
  const { addItem, token } = useStore();
  const [entries, setEntries] = useState<Entry[]>(() => files.map((_, i) => ({ key: String(i), preview: null, photo: null, status: "waiting", fields: null, issue: null })));
  const [editing, setEditing] = useState<{ key: string; fields: ItemFields } | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const alive = useRef(true);
  const started = useRef(false);
  const patch = (key: string, p: Partial<Entry>) => alive.current && setEntries((xs) => xs.map((e) => (e.key === key ? { ...e, ...p } : e)));

  useEffect(() => {
    alive.current = true;
    if (!started.current) {
      started.current = true;
      (async () => {
        // Pass 1: thumbnails + on-device colours for every photo, so all cards show right away.
        const ready: { key: string; photo: Blob; colours: string[]; lightness: number | null }[] = [];
        for (const [i, file] of files.entries()) {
          const key = String(i);
          try {
            const photo = await compress(file);
            const colours = await dominantColours(photo);
            const lightness = await measureLightness(photo).catch(() => null);
            patch(key, { photo, preview: URL.createObjectURL(photo), fields: blank(colours, lightness) });
            ready.push({ key, photo, colours, lightness });
          } catch {
            patch(key, { status: "rejected", issue: "We couldn't read this file. Try a JPEG or PNG." });
          }
        }
        // Pass 2: AI check, one photo at a time.
        for (const { key, photo, colours, lightness } of ready) {
          if (!alive.current) return;
          patch(key, { status: "reading" });
          const a = await analyse(photo, colours, await token());
          if (a.rejected) patch(key, { status: "rejected", issue: a.rejected });
          else if (a.source === "ai") patch(key, { status: "ready", issue: a.warning, fields: { ...blank(a.colours, lightness), name: a.name, category: a.category, slot: a.slot, pattern: a.pattern, formality: a.formality, season: a.season, styles: a.styles, fit: a.fit } });
          else patch(key, { status: "manual", issue: "Couldn't auto-fill this one. Tap to choose the details." });
        }
      })();
    }
    return () => { alive.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- runs once for the picked files

  const toSave = entries.filter(saveable);
  const busy = entries.filter((e) => e.status === "waiting" || e.status === "reading").length;
  const done = entries.length - busy;

  async function saveAll() {
    setSaving(0);
    let ok = 0;
    for (const e of toSave) {
      try {
        await addItem(e.photo!, { ...e.fields!, name: e.fields!.name.trim() || "New piece" });
        ok++;
        setSaving(ok);
        setEntries((xs) => xs.filter((x) => x.key !== e.key));
      } catch {
        toast(`Couldn't save ${e.fields!.name}. It's still in the list.`, "error");
      }
    }
    setSavedCount((n) => n + ok);
    setSaving(null);
  }

  const skipped = entries.filter((e) => e.status === "rejected").length;
  if (savedCount && entries.length === skipped) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        <motion.span className="flex size-16 items-center justify-center rounded-full bg-ink text-on-ink" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>
          <Check className="size-7" />
        </motion.span>
        <h1 className="mt-6 font-display text-title">{savedCount} {savedCount === 1 ? "piece" : "pieces"} added.</h1>
        <p className="mt-2 text-ink-3">They&apos;re ready for outfits.{skipped ? ` ${skipped} photo${skipped === 1 ? " wasn't" : "s weren't"} clothing, so we skipped ${skipped === 1 ? "it" : "them"}.` : ""}</p>
        <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
          <Button size="lg" onClick={onReset}>Add more</Button>
          <Link href="/wardrobe" className="flex h-12 items-center justify-center rounded-full hover:bg-stone">See wardrobe</Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="px-4 pb-44">
      <div className="px-2 pt-2" role="status">
        <h1 className="font-display text-title">Check {entries.length} {entries.length === 1 ? "piece" : "pieces"}</h1>
        <p className="mt-1 flex items-center gap-2 text-caption text-ink-3">
          {busy ? <><Loader2 className="size-3.5 animate-spin" aria-hidden /> Reading {Math.min(done + 1, entries.length)} of {entries.length}. You can check the finished ones meanwhile.</> : "All read. Tap any piece to change its details."}
        </p>
        <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-stone" aria-hidden>
          <motion.div className="h-full bg-ink" animate={{ width: `${(done / entries.length) * 100}%` }} transition={{ ease: EASE }} />
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <motion.li key={e.key} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
              className={cn("relative flex items-center gap-3 rounded-lg border bg-surface p-2.5", e.status === "rejected" ? "border-danger/40" : "border-line")}>
              <button type="button" disabled={!e.fields || e.status === "rejected"} onClick={() => e.fields && setEditing({ key: e.key, fields: e.fields })}
                className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default" aria-label={e.fields ? `Check details of ${e.fields.name}` : "Photo"}>
                <span className={cn("relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-studio", !e.preview && "skeleton")}>
                  {e.preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.preview} alt="" className={cn("size-full object-cover", e.status === "rejected" && "opacity-50 grayscale")} />
                  )}
                  {e.status === "reading" && <motion.span aria-hidden className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-champagne/50 to-transparent" initial={{ top: "-40%" }} animate={{ top: "100%" }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />}
                </span>
                <span className="min-w-0 flex-1">
                  {e.status === "rejected" ? (
                    <><span className="flex items-center gap-1.5 text-caption font-medium text-danger"><CircleAlert className="size-3.5" aria-hidden /> Can&apos;t add this photo</span><span className="mt-0.5 line-clamp-2 block text-[12px] text-ink-3">{e.issue}</span></>
                  ) : e.status === "waiting" || e.status === "reading" ? (
                    <><span className="block text-caption text-ink-2">{e.status === "reading" ? "Reading…" : "Waiting"}</span><span className="skeleton mt-1.5 block h-3 w-24 rounded-sm" /></>
                  ) : (
                    <>
                      <span className="block truncate text-body">{e.fields!.name}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
                        {e.fields!.colours.slice(0, 2).map((c) => <Swatch key={c} id={c} className="size-3" />)}
                        <span className="truncate capitalize">{e.fields!.category} · {e.fields!.formality}</span>
                      </span>
                      {e.issue && <span className="mt-1 line-clamp-1 block text-[11px] text-ink-3">{e.issue}</span>}
                    </>
                  )}
                </span>
                {e.status === "ready" && <Sparkles className="size-4 shrink-0 text-champagne" aria-label="Auto-filled" />}
                {(e.status === "ready" || e.status === "manual") && <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />}
              </button>
              <button type="button" onClick={() => setEntries((xs) => xs.filter((x) => x.key !== e.key))} aria-label="Remove from this batch"
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-stone hover:text-ink">
                <X className="size-4" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {!entries.length && <p className="mt-10 text-center text-ink-3">Nothing left to add. <button type="button" className="underline" onClick={onReset}>Pick photos</button></p>}

      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-ivory via-ivory to-transparent px-6 pt-10 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl">
          <Button size="lg" block disabled={!toSave.length} loading={saving !== null} onClick={saveAll}>
            {saving !== null ? `Saving ${saving + 1} of ${toSave.length + saving}` : `Save ${toSave.length} ${toSave.length === 1 ? "piece" : "pieces"}`}
          </Button>
          {busy > 0 && toSave.length > 0 && <p className="mt-2 text-center text-[12px] text-ink-3">{busy} still being read; save them after.</p>}
        </div>
      </div>

      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title="Check the details">
        {editing && (
          <div className="pb-2">
            <ItemForm value={editing.fields} onChange={(fields) => setEditing({ ...editing, fields })} />
            <Button block size="lg" className="mt-8" onClick={() => { patch(editing.key, { fields: editing.fields, status: "ready", issue: null }); setEditing(null); }}>Done</Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
