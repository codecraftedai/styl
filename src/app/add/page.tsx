"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Check, CircleAlert, Images, Sparkles, X } from "lucide-react";
import { Guard } from "@/components/shell/guard";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ItemForm, type ItemFields } from "@/components/wardrobe/item-form";
import { analyse } from "@/lib/analysis";
import { compress, dominantColours, measureLightness } from "@/lib/image";
import { clearPendingPhotos, peekPendingPhotos } from "@/lib/pending-photo";
import { BatchAdd } from "@/components/wardrobe/batch-add";
import { useStore } from "@/lib/store";

type Stage = "pick" | "analysing" | "rejected" | "review" | "saved";
const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_FILE = 25 * 1024 * 1024;
const MAX_BATCH = 10; // free AI tiers read a few photos a minute; 10 keeps a batch to a few minutes

export default function AddItem() {
  const { addItem, token, mode } = useStore();
  const router = useRouter();
  const [initial] = useState(peekPendingPhotos);
  const pending = initial?.length === 1 ? initial[0] : null;
  const [batch, setBatch] = useState<File[] | null>(initial && initial.length > 1 ? initial.slice(0, MAX_BATCH) : null);
  const [stage, setStage] = useState<Stage>(pending ? "analysing" : "pick");
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [fields, setFields] = useState<ItemFields | null>(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [saving, setSaving] = useState(false);
  const started = useRef(false);

  function start(file: File) {
    if (file.size > MAX_FILE) return toast("That photo is over 25 MB. Pick a smaller one.", "error");
    setStage("analysing");
    process(file);
  }

  /** Only sets state after the first await, so it is safe to kick off from an effect. */
  async function process(file: File) {
    try {
      const small = await compress(file);
      setPhoto(small);
      setPreview(URL.createObjectURL(small));
      const [a, lightness] = await Promise.all([
        dominantColours(small).then(async (cols) => analyse(small, cols, await token())),
        measureLightness(small).catch(() => null),
        new Promise((r) => setTimeout(r, 1400)), // let the scan finish one pass: feels deliberate, not glitchy
      ]);
      setAiUsed(a.source === "ai");
      if (a.rejected) { setIssue(a.rejected); setStage("rejected"); return; }
      setIssue(a.warning);
      setFields({ name: a.name, category: a.category, slot: a.slot, colours: a.colours, pattern: a.pattern, formality: a.formality, season: a.season, styles: a.styles, brand: "", notes: "", lightness, fit: a.fit });
      setStage("review");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't read that photo.", "error");
      setStage("pick");
    }
  }

  useEffect(() => {
    if (started.current || !initial) return;
    started.current = true;
    clearPendingPhotos();
    if (initial.length > MAX_BATCH) toast(`Added the first ${MAX_BATCH} photos. Add the rest in the next round.`);
    if (pending) process(pending);
  }); // runs once; `started` guards StrictMode's double mount

  /** Re-run the AI check on the same photo; keeps whatever the user already typed if it fails again. */
  async function retryAnalysis() {
    if (!photo || !fields) return;
    setRetrying(true);
    const a = await analyse(photo, fields.colours, await token());
    setRetrying(false);
    if (a.source !== "ai") return toast("Still couldn't check it. Fill the details yourself, or try again in a minute.", "error");
    setAiUsed(true);
    if (a.rejected) { setIssue(a.rejected); setStage("rejected"); return; }
    setIssue(a.warning);
    setFields({ ...fields, name: a.name, category: a.category, slot: a.slot, colours: a.colours, pattern: a.pattern, formality: a.formality, season: a.season, styles: a.styles, fit: a.fit ?? fields.fit });
  }

  async function save() {
    if (!photo || !fields) return;
    setSaving(true);
    try {
      await addItem(photo, { ...fields, name: fields.name.trim() || "New piece" });
      setStage("saved");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save. Try again.", "error");
    } finally { setSaving(false); }
  }

  const reset = () => { setBatch(null); setStage("pick"); setPhoto(null); setFields(null); setPreview(null); setIssue(null); };
  function pickMany(files: File[]) {
    const ok = files.filter((f) => f.size <= MAX_FILE);
    if (ok.length < files.length) toast("Skipped photos over 25 MB.", "error");
    if (ok.length > MAX_BATCH) toast(`Added the first ${MAX_BATCH} photos. Add the rest in the next round.`);
    if (ok.length === 1) start(ok[0]);
    else if (ok.length > 1) setBatch(ok.slice(0, MAX_BATCH));
  }
  const pickInput = (capture: boolean) => (
    <input type="file" accept="image/*" capture={capture ? "environment" : undefined} multiple={!capture} className="sr-only"
      onChange={(e) => { pickMany([...(e.target.files ?? [])]); e.target.value = ""; }} />
  );

  return (
    <Guard need="app">
      <div className="mx-auto min-h-dvh max-w-2xl pt-safe">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-ivory/85 px-4 backdrop-blur-md">
          <button type="button" onClick={() => router.back()} aria-label="Close" className="flex size-11 items-center justify-center rounded-full hover:bg-stone"><X className="size-5" /></button>
          <p className="text-label uppercase text-ink-3">{batch || stage === "review" ? "Check the details" : "Add to wardrobe"}</p>
          <span className="size-11" />
        </header>

        {batch ? <BatchAdd key={batch.map((f) => f.name + f.size).join()} files={batch} onReset={reset} /> : (
        <AnimatePresence mode="wait">
          {stage === "pick" && (
            <motion.div key="pick" exit={{ opacity: 0 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }} className="px-6 pt-6">
              <h1 className="font-display text-title">Clear photos, <em>one piece each</em>.</h1>
              <ul className="mt-4 flex flex-col gap-1.5 text-caption text-ink-3">
                <li>Lay it flat or hang it, on a plain background.</li>
                <li>Good daylight, no flash. Whole item in frame.</li>
                <li>Pick up to {MAX_BATCH} photos at once from your library.</li>
              </ul>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[{ icon: Camera, t: "Take a photo", c: true }, { icon: Images, t: "Choose from library", c: false }].map(({ icon: Icon, t, c }) => (
                  <label key={t} className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-3/40 bg-surface transition-colors hover:border-ink active:scale-[0.99] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-champagne">
                    <Icon className="size-7 stroke-[1.25]" aria-hidden />{t}{pickInput(c)}
                  </label>
                ))}
              </div>
            </motion.div>
          )}

          {stage === "rejected" && (
            <motion.div key="rejected" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ ease: EASE }} className="px-6 pt-6 text-center">
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="The photo you picked" className="mx-auto w-40 rounded-xl opacity-60 grayscale" />
              )}
              <p className="mt-6 flex items-center justify-center gap-2 font-display text-heading"><CircleAlert className="size-5 text-danger" aria-hidden /> Can&apos;t add this photo</p>
              <p role="alert" className="mx-auto mt-2 max-w-xs text-ink-2">{issue}</p>
              <p className="mx-auto mt-3 max-w-xs text-caption text-ink-3">Upload a clear photo of one clothing item, shoe, bag or accessory.</p>
              <div className="mx-auto mt-8 grid max-w-xs gap-3">
                <label className="flex h-13 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink font-medium text-on-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-champagne">
                  <Images className="size-4" aria-hidden /> Choose another photo{pickInput(false)}
                </label>
                <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full hover:bg-stone has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-champagne">
                  <Camera className="size-4" aria-hidden /> Take a photo{pickInput(true)}
                </label>
              </div>
            </motion.div>
          )}

          {(stage === "analysing" || stage === "review") && (
            <motion.div key="work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 pb-40">
              <motion.div layout transition={{ duration: 0.6, ease: EASE }}
                className={stage === "analysing" ? "mx-auto mt-6 max-w-sm" : "mx-auto mt-2 w-40"}>
                <div className="relative overflow-hidden rounded-xl bg-studio">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Your photo" className="block h-auto w-full" />
                  ) : <div className="skeleton aspect-[3/4]" />}
                  {stage === "analysing" && (
                    <motion.div aria-hidden className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-champagne/40 to-transparent"
                      initial={{ top: "-25%" }} animate={{ top: "100%" }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} />
                  )}
                </div>
              </motion.div>

              {stage === "analysing" ? (
                <div className="mt-8 text-center" role="status">
                  <p className="flex items-center justify-center gap-2 font-display text-heading"><Sparkles className="size-4" aria-hidden /> Reading your piece</p>
                  <p className="mt-1 text-caption text-ink-3">Colour, type, dressiness, season… this can take up to a minute.</p>
                </div>
              ) : fields && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease: EASE }} className="mt-8">
                  {issue && <p role="status" className="mb-4 flex items-start gap-2 rounded-md bg-stone px-4 py-3 text-caption text-ink-2"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{issue} You can still save it, or retake for better suggestions.</p>}
                  {!aiUsed && mode === "cloud" && (
                    <div role="status" className="mb-4 rounded-md bg-stone px-4 py-3 text-caption text-ink-2">
                      <p className="flex items-start gap-2"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />We couldn&apos;t check this photo right now (the AI service is busy), so it wasn&apos;t auto-filled.</p>
                      <Button size="sm" variant="secondary" className="mt-3" loading={retrying} onClick={retryAnalysis}><Sparkles className="size-3.5" aria-hidden /> Try auto-fill again</Button>
                    </div>
                  )}
                  <p className="mb-6 text-center text-caption text-ink-3">
                    {aiUsed ? "We filled everything in from the photo. Change anything that's off, or just save." : "We picked out the colours. Choose the category and details."}
                  </p>
                  <ItemForm value={fields} onChange={setFields} />
                </motion.div>
              )}
            </motion.div>
          )}

          {stage === "saved" && (
            <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
              <motion.span className="flex size-16 items-center justify-center rounded-full bg-ink text-on-ink"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>
                <Check className="size-7" />
              </motion.span>
              <motion.h1 className="mt-6 font-display text-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                In your wardrobe.
              </motion.h1>
              <p className="mt-2 text-ink-3">{fields?.name} is ready for outfits.</p>
              <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
                <Button size="lg" onClick={reset}>Add another</Button>
                <Link href="/wardrobe" className="flex h-12 items-center justify-center rounded-full hover:bg-stone">See wardrobe</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}

        {!batch && stage === "review" && (
          <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-ivory via-ivory to-transparent px-6 pt-10 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto flex max-w-2xl gap-3">
              <Button variant="secondary" size="lg" onClick={reset}>Retake</Button>
              <Button size="lg" block loading={saving} onClick={save}>Save to wardrobe</Button>
            </div>
          </div>
        )}
      </div>
    </Guard>
  );
}
