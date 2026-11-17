"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { useStore } from "@/lib/store";
import type { Outfit } from "@/lib/types";
import { Collage } from "./collage";

export function SavedList({ onBuild }: { onBuild: () => void }) {
  const { outfits, items, urls, markWorn, deleteOutfit } = useStore();
  const [open, setOpen] = useState<Outfit | null>(null);
  const piecesOf = (o: Outfit) => items.filter((i) => o.itemIds.includes(i.id));

  if (!outfits.length) {
    return <EmptyState icon={<Bookmark className="size-6 stroke-[1.25]" />} title="No saved outfits yet" body="Save a suggestion you like, or build your own look." action={<Button variant="secondary" onClick={onBuild}>Build an outfit</Button>} />;
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
        {outfits.map((o) => (
          <button key={o.id} type="button" onClick={() => setOpen(o)} className="rounded-lg text-left transition-transform active:scale-[0.98]">
            <Collage items={piecesOf(o)} urls={urls} size="sm" />
            <p className="mt-2.5 truncate px-1 text-caption font-medium">{o.name}</p>
            <p className="px-1 text-[12px] text-ink-3">{o.occasion} · {o.itemIds.length} pieces</p>
          </button>
        ))}
      </div>
      <BottomSheet open={!!open} onClose={() => setOpen(null)} title={open?.name ?? "Outfit"}>
        {open && (
          <div className="pb-2">
            <Collage items={piecesOf(open)} urls={urls} />
            <div className="mt-5 flex gap-3">
              <Button block onClick={() => { markWorn(open.itemIds); toast("Logged as worn today"); setOpen(null); }}>Wear today</Button>
              <Button variant="danger" onClick={() => { deleteOutfit(open.id); setOpen(null); toast("Outfit deleted"); }}>Delete</Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
