"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { NAV, isActive } from "./nav-items";

const SPRING = { type: "spring", stiffness: 520, damping: 38 } as const;

/**
 * Phone tab bar: a floating capsule. The active tab grows into a white pill with its label,
 * so the current place is always named; Add sits in the middle of the thumb zone.
 */
export function BottomNav({ onAdd }: { onAdd: () => void }) {
  const path = usePathname();
  const tab = (i: (typeof NAV)[number]) => {
    const on = isActive(path, i.href);
    return (
      <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} aria-label={i.label}
        className={cn("relative flex h-12 min-w-12 items-center justify-center rounded-full transition-colors active:scale-95", on ? "px-4 text-on-ink" : "flex-1 text-ink-3 hover:text-ink")}>
        {on && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-ink" transition={SPRING} />}
        <span className="relative flex items-center gap-2">
          <i.icon className={cn("size-5", on ? "stroke-2" : "stroke-[1.5]")} aria-hidden />
          {on && <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-caption font-semibold">{i.label}</motion.span>}
        </span>
      </Link>
    );
  };
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="mx-auto flex max-w-md items-center gap-1 rounded-full border border-line bg-surface/85 p-1.5 shadow-float backdrop-blur-xl">
        {NAV.slice(0, 2).map(tab)}
        <button type="button" onClick={onAdd} aria-label="Add item"
          className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-stone text-ink transition-[background-color,transform] hover:bg-line active:scale-90">
          <Plus className="size-5" />
        </button>
        {NAV.slice(2).map(tab)}
      </div>
    </nav>
  );
}
