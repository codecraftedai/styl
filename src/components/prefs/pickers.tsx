"use client";

import { Check, CloudSun, Snowflake, Sun } from "lucide-react";
import { COLOURS } from "@/lib/colours";
import { CLIMATES, OCCASIONS, STYLES, WEARS, type Climate, type Wear } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Swatch } from "@/components/ui/swatch";

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

type StyleName = (typeof STYLES)[number];

// Photos: public/styles/*.webp (Unsplash, see CREDITS.md). Notes change with the wardrobe the user dresses from.
const STYLE_NOTES: Record<StyleName, Record<Wear, string>> = {
  Minimal: { Women: "Clean lines, neutral tones", Men: "Plain tees, clean chinos", Both: "Clean lines, few colours" },
  Classic: { Women: "Trench, blazer, timeless", Men: "Suits, loafers, tailored", Both: "Timeless, tailored" },
  Streetwear: { Women: "Oversized, cargo, sneakers", Men: "Hoodies, cargos, sneakers", Both: "Relaxed, graphic, sneakers" },
  "Smart casual": { Women: "Shirt, trousers, flats", Men: "Shirt, chinos, boots", Both: "Polished but easy" },
  Sporty: { Women: "Leggings, sets, trainers", Men: "Joggers, tees, trainers", Both: "Athleisure, comfort" },
  Bohemian: { Women: "Flowy dresses, earthy prints", Men: "Linen, prints, sandals", Both: "Flowy, earthy, printed" },
  Ethnic: { Women: "Sarees, kurtas, lehengas", Men: "Kurtas, sherwanis, Nehru jackets", Both: "Kurtas, sarees, Indian wear" },
  Edgy: { Women: "Leather, black, boots", Men: "Leather jackets, black denim", Both: "Dark, bold, statement" },
};
const slug = (s: string) => s.toLowerCase().replace(/ /g, "-");

type Multi<T> = { value: T[]; onChange: (v: T[]) => void };

export function StylePicker({ value, onChange, wear = "Both" }: Multi<StyleName> & { wear?: Wear }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {STYLES.map((s) => {
        const on = value.includes(s);
        return (
          <button key={s} type="button" aria-pressed={on} onClick={() => onChange(toggle(value, s))}
            className={cn("group relative aspect-[4/5] overflow-hidden rounded-lg bg-stone text-left ring-offset-2 ring-offset-ivory transition-[box-shadow,transform] active:scale-[0.97]", on && "ring-2 ring-ink")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/styles/${slug(s)}.webp`} alt="" loading="lazy" className={cn("absolute inset-0 size-full object-cover transition-transform duration-700 ease-[var(--ease-lux)] group-hover:scale-105", on && "scale-105")} />
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-3 text-white">
              <span className="block text-body font-medium leading-tight">{s}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-white/75">{STYLE_NOTES[s][wear]}</span>
            </span>
            <span className={cn("absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-full transition-all", on ? "scale-100 bg-white text-black" : "scale-90 border border-white/70 bg-black/20")}>
              {on && <Check className="size-3.5" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function WearPicker({ value, onChange }: { value: Wear; onChange: (w: Wear) => void }) {
  const LABEL: Record<Wear, [string, string]> = { Women: ["Womenswear", "Dresses, sarees, skirts and more"], Men: ["Menswear", "Shirts, kurtas, trousers and more"], Both: ["Both / prefer not to say", "Show everything"] };
  return (
    <div role="radiogroup" className="flex flex-col gap-3">
      {WEARS.map((w) => {
        const on = value === w;
        return (
          <button key={w} type="button" role="radio" aria-checked={on} onClick={() => onChange(w)}
            className={cn("flex items-center gap-4 rounded-lg border p-4 text-left transition-colors", on ? "border-ink bg-stone" : "border-line bg-surface hover:border-ink-3")}>
            <span className="flex-1"><span className="block">{LABEL[w][0]}</span><span className="block text-caption text-ink-3">{LABEL[w][1]}</span></span>
            <span className={cn("size-5 rounded-full border-2 transition-all", on ? "border-[6px] border-ink" : "border-line")} />
          </button>
        );
      })}
    </div>
  );
}

export function OccasionPicker({ value, onChange }: Multi<(typeof OCCASIONS)[number]>) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {OCCASIONS.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => onChange(toggle(value, o))}
            className={cn("h-12 rounded-full border px-5 transition-colors active:scale-[0.97]", on ? "border-ink bg-ink text-on-ink" : "border-line bg-surface hover:border-ink-3")}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function ColourPicker({ value, onChange, disabled = [] }: Multi<string> & { disabled?: string[] }) {
  return (
    <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6">
      {COLOURS.filter((c) => c.id !== "multi").map((c) => {
        const on = value.includes(c.id), off = disabled.includes(c.id);
        return (
          <button key={c.id} type="button" aria-pressed={on} disabled={off} onClick={() => onChange(toggle(value, c.id))}
            className="group flex flex-col items-center gap-2 disabled:opacity-25">
            <span className={cn("relative flex size-12 items-center justify-center rounded-full transition-transform group-active:scale-90", on && "ring-2 ring-ink ring-offset-2 ring-offset-ivory")}>
              <Swatch id={c.id} className="size-12" />
              {on && <Check className="absolute size-4 text-white mix-blend-difference" />}
            </span>
            <span className="text-[11px] text-ink-2">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const CLIMATE_META: Record<Climate, { icon: typeof Sun; note: string }> = {
  Hot: { icon: Sun, note: "Most days above 27°" }, Mild: { icon: CloudSun, note: "Pleasant, 18–27°" }, Cold: { icon: Snowflake, note: "Layers most of the year" },
};

export function ClimatePicker({ value, onChange }: { value: Climate; onChange: (c: Climate) => void }) {
  return (
    <div role="radiogroup" className="flex flex-col gap-3">
      {CLIMATES.map((c) => {
        const { icon: Icon, note } = CLIMATE_META[c];
        const on = value === c;
        return (
          <button key={c} type="button" role="radio" aria-checked={on} onClick={() => onChange(c)}
            className={cn("flex items-center gap-4 rounded-lg border p-4 text-left transition-colors", on ? "border-ink bg-stone" : "border-line bg-surface hover:border-ink-3")}>
            <span className="flex size-11 items-center justify-center rounded-full bg-stone"><Icon className="size-5 stroke-[1.5]" /></span>
            <span className="flex-1"><span className="block">{c}</span><span className="block text-caption text-ink-3">{note}</span></span>
            <span className={cn("size-5 rounded-full border-2 transition-all", on ? "border-[6px] border-ink" : "border-line")} />
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, note }: { checked: boolean; onChange: (v: boolean) => void; label: string; note: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-lg border border-line bg-surface p-4">
      <span className="flex-1"><span className="block">{label}</span><span className="block text-caption text-ink-3">{note}</span></span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative h-7 w-12 rounded-full bg-line transition-colors peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-champagne after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}

/** Single-choice list with a short explanation per option. */
export function ChoicePicker<T extends string>({ options, value, onChange, notes }: { options: readonly T[]; value: T; onChange: (v: T) => void; notes: Partial<Record<T, string>> }) {
  return (
    <div role="radiogroup" className="flex flex-col gap-2.5">
      {options.map((o) => {
        const on = value === o;
        return (
          <button key={o} type="button" role="radio" aria-checked={on} onClick={() => onChange(o)}
            className={cn("flex items-center gap-4 rounded-lg border px-4 py-3.5 text-left transition-colors active:scale-[0.99]", on ? "border-ink bg-stone" : "border-line bg-surface hover:border-ink-3")}>
            <span className="flex-1"><span className="block">{o}</span>{notes[o] && <span className="block text-caption text-ink-3">{notes[o]}</span>}</span>
            <span className={cn("size-5 shrink-0 rounded-full border-2 transition-all", on ? "border-[6px] border-ink" : "border-line")} />
          </button>
        );
      })}
    </div>
  );
}
