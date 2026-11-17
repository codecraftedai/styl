"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Swatch } from "@/components/ui/swatch";
import { COLOURS } from "@/lib/colours";
import { DEFAULT_SLOT, PATTERNS } from "@/lib/analysis";
import { CATEGORIES, FITS, FORMALITY, SEASONS, SLOTS, STYLES, type Item } from "@/lib/types";
import { cn } from "@/lib/cn";

export type ItemFields = Pick<Item, "name" | "category" | "slot" | "colours" | "pattern" | "formality" | "season" | "styles" | "brand" | "notes" | "lightness" | "fit">;

const SLOT_LABEL: Record<Item["slot"], string> = {
  top: "Top", bottom: "Bottom", "one-piece": "Full outfit", outer: "Layer", shoes: "Shoes", bag: "Bag", accessory: "Accessory",
};
const SEASON_LABEL: Record<Item["season"], string> = { summer: "Warm days", winter: "Cold days", all: "All year" };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const SHADES = ["light", "medium", "dark"] as const;
const SHADE_VALUE: Record<(typeof SHADES)[number], number> = { light: 0.8, medium: 0.5, dark: 0.2 };
const shadeOf = (l: number | null) => (l === null ? "medium" : l >= 0.6 ? "light" : l <= 0.35 ? "dark" : "medium");

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-3 text-label uppercase text-ink-3">{label}{hint && <span className="ml-2 normal-case tracking-normal text-ink-3/80">{hint}</span>}</legend>
      {children}
    </fieldset>
  );
}

function Segmented<T extends string>({ options, value, onChange, label, id }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: (v: T) => string; id: string }) {
  return (
    <div role="radiogroup" className="relative grid auto-cols-fr grid-flow-col rounded-full bg-stone p-1">
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)}
          className={cn("relative z-10 h-10 rounded-full text-caption font-medium transition-colors", value === o ? "text-ink" : "text-ink-3 hover:text-ink-2")}>
          {value === o && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 -z-10 rounded-full bg-line" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          {label(o)}
        </button>
      ))}
    </div>
  );
}

const Row = ({ children }: { children: ReactNode }) => <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 no-scrollbar">{children}</div>;

export function ItemForm({ value, onChange }: { value: ItemFields; onChange: (v: ItemFields) => void }) {
  const set = <K extends keyof ItemFields>(k: K, v: ItemFields[K]) => onChange({ ...value, [k]: v });
  const toggleColour = (id: string) => {
    const has = value.colours.includes(id);
    set("colours", has ? value.colours.filter((c) => c !== id) : [...value.colours, id].slice(-3));
  };

  return (
    <div className="flex flex-col gap-8">
      <Input label="Name" value={value.name} onChange={(e) => set("name", e.target.value)} maxLength={60} />

      <Field label="Category">
        <Row>{CATEGORIES.map((c) => <Chip key={c} selected={value.category === c} onClick={() => onChange({ ...value, category: c, slot: DEFAULT_SLOT[c] })}>{c}</Chip>)}</Row>
      </Field>

      <Field label="Worn as" hint="how it fits into an outfit">
        <Row>{SLOTS.map((s) => <Chip key={s} selected={value.slot === s} onClick={() => set("slot", s)}>{SLOT_LABEL[s]}</Chip>)}</Row>
      </Field>

      <Field label="Colours" hint="main first, up to 3">
        <Row>
          {COLOURS.map((c) => {
            const i = value.colours.indexOf(c.id);
            return (
              <Chip key={c.id} selected={i >= 0} onClick={() => toggleColour(c.id)} className="flex items-center gap-2 pl-2.5">
                <Swatch id={c.id} />{c.label}{i === 0 && value.colours.length > 1 && <span className="text-[10px] opacity-70">main</span>}
              </Chip>
            );
          })}
        </Row>
      </Field>

      <Field label="Pattern">
        <Row>{PATTERNS.map((p) => <Chip key={p} selected={value.pattern === p} onClick={() => set("pattern", p)}>{p}</Chip>)}</Row>
      </Field>

      <Field label="Shade" hint="how light or dark it is">
        <Segmented id="shade" options={SHADES} value={shadeOf(value.lightness)} onChange={(v) => set("lightness", SHADE_VALUE[v])} label={cap} />
      </Field>

      {(["top", "bottom", "one-piece", "outer"] as Item["slot"][]).includes(value.slot) && (
        <Field label="Fit">
          <Row>{FITS.map((f) => <Chip key={f} selected={value.fit === f} onClick={() => set("fit", value.fit === f ? null : f)}>{cap(f)}</Chip>)}</Row>
        </Field>
      )}

      <Field label="Dressiness">
        <Segmented id="formality" options={FORMALITY} value={value.formality} onChange={(v) => set("formality", v)} label={cap} />
      </Field>

      <Field label="Season">
        <Segmented id="season" options={SEASONS} value={value.season} onChange={(v) => set("season", v)} label={(s) => SEASON_LABEL[s]} />
      </Field>

      <Field label="Style" hint="optional">
        <Row>{STYLES.map((s) => <Chip key={s} selected={value.styles.includes(s)} onClick={() => set("styles", value.styles.includes(s) ? value.styles.filter((x) => x !== s) : [...value.styles, s])}>{s}</Chip>)}</Row>
      </Field>

      <Input label="Brand" hint="Optional" value={value.brand} onChange={(e) => set("brand", e.target.value)} maxLength={40} />
      <Input label="Notes" hint="Optional: size, where you bought it, fit" value={value.notes} onChange={(e) => set("notes", e.target.value)} maxLength={200} />
    </div>
  );
}
