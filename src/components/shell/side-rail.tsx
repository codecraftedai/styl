"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { NAV, isActive } from "./nav-items";

export function SideRail({ onAdd }: { onAdd: () => void }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r border-line bg-surface/40 px-5 py-8 md:flex">
      <Link href="/" className="px-3 font-display text-[1.875rem] leading-none font-bold tracking-[-0.04em]">Styl</Link>
      <Button onClick={onAdd} block><Plus className="size-4" aria-hidden /> Add item</Button>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV.map((i) => {
          const on = isActive(path, i.href);
          return (
            <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
              className={cn("flex h-12 items-center gap-3 rounded-full px-4 font-medium transition-colors", on ? "bg-stone text-ink" : "text-ink-3 hover:bg-stone/60 hover:text-ink")}>
              <i.icon className={cn("size-[18px]", on ? "stroke-2" : "stroke-[1.5]")} aria-hidden /> {i.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
