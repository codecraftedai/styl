"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { NAV, isActive } from "./nav-items";

/** Phone tab bar: 4 destinations split around a raised Add button (thumb zone). */
export function BottomNav({ onAdd }: { onAdd: () => void }) {
  const path = usePathname();
  const tab = (i: (typeof NAV)[number]) => {
    const on = isActive(path, i.href);
    return (
      <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={cn("relative flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[10px] tracking-wide transition-colors active:scale-95", on ? "text-ink" : "text-ink-3 hover:text-ink-2")}>
        <i.icon className={cn("size-[22px] transition-[stroke-width]", on ? "stroke-[1.75]" : "stroke-[1.25]")} aria-hidden />
        {i.label}
        {on && <motion.span layoutId="tab-dot" className="absolute top-1.5 size-1 rounded-full bg-ink" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
      </Link>
    );
  };
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="flex items-center px-2">
        {NAV.slice(0, 2).map(tab)}
        <div className="flex flex-1 justify-center">
          <button type="button" onClick={onAdd} aria-label="Add item" className="-mt-7 flex size-14 items-center justify-center rounded-full bg-ink text-on-ink shadow-float ring-4 ring-ivory transition-transform hover:scale-105 active:scale-95">
            <Plus className="size-6" />
          </button>
        </div>
        {NAV.slice(2).map(tab)}
      </div>
    </nav>
  );
}
