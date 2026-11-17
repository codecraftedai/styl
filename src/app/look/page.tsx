"use client";

import { Suspense } from "react";
import { Guard } from "@/components/shell/guard";
import { LookReview } from "@/components/outfits/look-review";

// Full-screen review of a look built in Outfits → Build. Outside the (app) shell: its own action bar replaces the tab bar.
export default function LookPage() {
  return (
    <Guard need="app">
      <Suspense>
        <main className="min-h-dvh">
          <LookReview />
        </main>
      </Suspense>
    </Guard>
  );
}
