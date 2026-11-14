"use client";

import { Camera, Images } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";

type AddSheetProps = { open: boolean; onClose: () => void; onPick: (file: File) => void };

const ACCEPT = "image/*";

/** Two native file inputs: `capture` opens the camera on phones, the other opens the library. */
export function AddSheet({ open, onClose, onPick }: AddSheetProps) {
  const option = (icon: React.ReactNode, title: string, body: string, capture?: boolean) => (
    <label className="flex cursor-pointer items-center gap-4 rounded-lg border border-line p-4 transition-colors hover:border-ink-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-champagne">
      <span className="flex size-11 items-center justify-center rounded-full bg-stone">{icon}</span>
      <span className="flex-1">
        <span className="block text-ink">{title}</span>
        <span className="block text-caption text-ink-3">{body}</span>
      </span>
      <input
        type="file"
        accept={ACCEPT}
        capture={capture ? "environment" : undefined}
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }}
      />
    </label>
  );
  return (
    <BottomSheet open={open} onClose={onClose} title="Add to wardrobe">
      <p className="mb-4 text-caption text-ink-3">Lay the item flat or hang it in good light. Clear photo, one item, plain background. We&apos;ll read the rest.</p>
      <div className="flex flex-col gap-3">
        {option(<Camera className="size-5" aria-hidden />, "Take a photo", "Use your camera", true)}
        {option(<Images className="size-5" aria-hidden />, "Choose from library", "Pick a photo you already took")}
      </div>
    </BottomSheet>
  );
}
