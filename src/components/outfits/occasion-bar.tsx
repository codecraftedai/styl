"use client";

import { Chip } from "@/components/ui/chip";
import type { Occasion } from "@/lib/types";

export function OccasionBar({ list, value, onChange }: { list: Occasion[]; value: Occasion; onChange: (o: Occasion) => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar md:-mx-10 md:px-10" role="group" aria-label="Occasion">
      {list.map((o) => <Chip key={o} selected={o === value} onClick={() => onChange(o)}>{o}</Chip>)}
    </div>
  );
}
