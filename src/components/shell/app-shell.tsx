"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { setPendingPhoto } from "@/lib/pending-photo";
import { AddSheet } from "./add-sheet";
import { BottomNav } from "./bottom-nav";
import { Guard } from "./guard";
import { SideRail } from "./side-rail";

export function AppShell({ children }: { children: ReactNode }) {
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  const onPick = (f: File) => { setPendingPhoto(f); setAdding(false); router.push("/add"); };
  return (
    <Guard need="app">
      <div className="flex min-h-dvh">
        <SideRail onAdd={() => setAdding(true)} />
        <main className="min-w-0 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
        <BottomNav onAdd={() => setAdding(true)} />
        <AddSheet open={adding} onClose={() => setAdding(false)} onPick={onPick} />
      </div>
    </Guard>
  );
}
