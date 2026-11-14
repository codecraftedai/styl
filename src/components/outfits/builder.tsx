"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { ItemImage } from "@/components/wardrobe/item-image";
import { useStore } from "@/lib/store";
import type { Occasion, Slot } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Collage } from "./collage";
import { OccasionBar } from "./occasion-bar";

const ROWS: { slot: Slot; label: string }[] = [
  { slot: "top", label: "Top" }, { slot: "bottom", label: "Bottom" }, { slot: "one-piece", label: "Full outfit" },
  { slot: "outer", label: "Layer" }, { slot: "shoes", label: "Shoes" }, { slot: "bag", label: "Bag" }, { slot: "accessory", label: "Accessories" },
];

export function Builder({ occasions, onSaved }: { occasions: Occasion[]; onSaved: () => void }) {
  const { items, urls, saveOutfit } = useStore();
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState<Occasion>(occasions[0]);
  const chosen = items.filter((i) => picked.includes(i.id));

  // One per slot (accessories can stack). A full outfit replaces top + bottom and vice versa.
  function toggle(id: string) {
    const it = items.find((i) => i.id === id)!;
    if (picked.includes(id)) return setPicked(picked.filter((p) => p !== id));
    const clash = (s: Slot) => s === it.slot || (it.slot === "one-piece" && (s === "top" || s === "bottom")) || (s === "one-piece" && (it.slot === "top" || it.slot === "bottom"));
    setPicked([...items.filter((i) => picked.includes(i.id) && (it.slot === "accessory" || !clash(i.slot))).map((i) => i.id), id]);
  }

  return (
    <div className="md:grid md:grid-cols-[1fr_340px] md:gap-10">
      <div className="flex flex-col gap-7">
        {ROWS.map(({ slot, label }) => {
          const list = items.filter((i) => i.slot === slot);
          if (!list.length) return null;
          return (
            <section key={slot}>
              <h3 className="mb-3 text-label uppercase text-ink-3">{label}</h3>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:px-0">
                {list.map((i) => {
                  const on = picked.includes(i.id);
                  return (
                    <button key={i.id} type="button" aria-pressed={on} aria-label={i.name} onClick={() => toggle(i.id)} className="relative w-24 shrink-0 active:scale-95 transition-transform">
                      <ItemImage src={urls[i.imagePath]} alt="" fit="cover" className={cn("aspect-[4/5] rounded-lg ring-offset-2 ring-offset-ivory transition-shadow", on && "ring-2 ring-ink")} />
                      {on && <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-on-ink"><Check className="size-3" /></span>}
                      <span className="mt-1.5 block truncate text-[11px] text-ink-2">{i.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <aside className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] mt-8 rounded-xl border border-line bg-surface p-4 shadow-float md:top-8 md:bottom-auto md:mt-0 md:self-start">
        {chosen.length ? <Collage items={chosen} urls={urls} size="sm" /> : <p className="py-6 text-center text-caption text-ink-3">Tap pieces to build a look.</p>}
        {chosen.length > 1 && (
          <div className="mt-4 flex flex-col gap-4">
            <Input label="Name" placeholder={`${occasion} look`} value={name} onChange={(e) => setName(e.target.value)} />
            <OccasionBar list={occasions} value={occasion} onChange={setOccasion} />
            <Button block onClick={() => { saveOutfit({ name: name.trim() || `${occasion} look`, itemIds: picked, occasion }); toast("Outfit saved"); setPicked([]); setName(""); onSaved(); }}>
              Save outfit
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}
