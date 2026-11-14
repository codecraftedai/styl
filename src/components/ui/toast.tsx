"use client";

import { useSyncExternalStore } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

type Toast = { id: number; text: string; tone: "success" | "error" };

// ponytail: module-level store, one toast at a time. Queue it if stacking is ever needed.
let current: Toast | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function toast(text: string, tone: Toast["tone"] = "success") {
  const t = { id: Date.now(), text, tone };
  current = t;
  emit();
  setTimeout(() => { if (current?.id === t.id) { current = null; emit(); } }, 3500);
}

export function Toaster() {
  const t = useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => current,
    () => null,
  );
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-8">
      {t && (
        <div key={t.id} className="flex animate-fade-up items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-caption text-on-ink shadow-float">
          {t.tone === "success" ? <CircleCheck className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />}
          {t.text}
        </div>
      )}
    </div>
  );
}
