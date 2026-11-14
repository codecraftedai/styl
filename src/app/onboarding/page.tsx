"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Guard } from "@/components/shell/guard";
import { Button } from "@/components/ui/button";
import { ClimatePicker, ColourPicker, OccasionPicker, StylePicker, Toggle, WearPicker } from "@/components/prefs/pickers";
import { toast } from "@/components/ui/toast";
import { useStore } from "@/lib/store";
import { EMPTY_PREFS, type Prefs } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Onboarding() {
  const { profile, saveProfile } = useStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState(profile?.name ?? "");
  const [prefs, setPrefs] = useState<Prefs>({ ...EMPTY_PREFS, ...profile?.prefs });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Prefs>(k: K) => (v: Prefs[K]) => setPrefs((p) => ({ ...p, [k]: v }));

  const steps: { title: ReactNode; note: string; body: ReactNode; ok: boolean; optional?: boolean }[] = [
    {
      title: <>First, what should we <em>call you</em>?</>, note: "Just for greetings. Nothing public.", ok: name.trim().length > 0,
      body: (
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" aria-label="Your first name" autoComplete="given-name"
          className="w-full border-b border-line bg-transparent pb-3 font-display text-[2.25rem] placeholder:text-ink-3/50 focus:border-ink focus:outline-none" />
      ),
    },
    { title: <>What do you <em>usually wear</em>?</>, note: "Helps us describe styles and pieces the right way.", ok: true, body: <WearPicker value={prefs.wear} onChange={set("wear")} /> },
    { title: <>Which styles feel <em>like you</em>?</>, note: "Pick as many as you like. Suggestions lean towards these.", ok: prefs.styles.length > 0, body: <StylePicker value={prefs.styles} onChange={set("styles")} wear={prefs.wear} /> },
    { title: <>Where do you <em>usually</em> dress for?</>, note: "We'll put these occasions first.", ok: prefs.occasions.length > 0, body: <OccasionPicker value={prefs.occasions} onChange={set("occasions")} /> },
    { title: <>Colours you <em>love</em> wearing</>, note: "Outfits with these get a nudge up.", ok: true, optional: true, body: <ColourPicker value={prefs.loveColours} onChange={set("loveColours")} disabled={prefs.avoidColours} /> },
    { title: <>Any colours you <em>avoid</em>?</>, note: "We'll keep them out of suggestions.", ok: true, optional: true, body: <ColourPicker value={prefs.avoidColours} onChange={set("avoidColours")} disabled={prefs.loveColours} /> },
    {
      title: <>And the <em>weather</em> where you live?</>, note: "So we never suggest a wool coat in May.", ok: true,
      body: (
        <div className="flex flex-col gap-5">
          <ClimatePicker value={prefs.climate} onChange={set("climate")} />
          <Toggle checked={prefs.liveWeather} onChange={set("liveWeather")} label="Use today's weather" note="Asks for your location. Used only to fetch the temperature." />
        </div>
      ),
    },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;

  const go = (d: number) => { setDir(d); setStep((x) => x + d); };

  async function finish() {
    setBusy(true);
    try {
      await saveProfile({ name: name.trim(), prefs, onboarded: true });
      router.replace("/");
      toast(`Welcome, ${name.trim()}. Add your first pieces.`);
    } catch {
      toast("Couldn't save. Check your connection and try again.", "error");
      setBusy(false);
    }
  }

  return (
    <Guard need="signed-in">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-6 pt-safe">
        <div className="flex h-16 items-center gap-3">
          <button type="button" onClick={() => go(-1)} disabled={step === 0} aria-label="Back" className="-ml-3 flex size-11 items-center justify-center rounded-full hover:bg-stone disabled:invisible">
            <ArrowLeft className="size-5" />
          </button>
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-stone" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}>
            <motion.div className="h-full bg-ink" animate={{ width: `${((step + 1) / steps.length) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} />
          </div>
          <span className="w-10 text-right text-caption text-ink-3 tabular-nums">{step + 1}/{steps.length}</span>
        </div>

        <div className="relative flex-1 overflow-x-hidden">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.section key={step} custom={dir}
              initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.35, ease: EASE }} className="pt-8 pb-36">
              <h1 className="font-display text-title">{s.title}</h1>
              <p className="mt-2 mb-8 text-ink-3">{s.note}</p>
              {s.body}
            </motion.section>
          </AnimatePresence>
        </div>

        <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-ivory via-ivory to-transparent px-6 pt-10 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-xl gap-3">
            {s.optional && <Button variant="ghost" size="lg" onClick={() => go(1)}>Skip</Button>}
            <Button size="lg" block disabled={!s.ok} loading={busy} onClick={() => (last ? finish() : go(1))}>
              {last ? "Start styling" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </Guard>
  );
}
