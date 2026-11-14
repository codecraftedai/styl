"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Guard } from "@/components/shell/guard";

const EASE = [0.22, 1, 0.36, 1] as const;
const LINES = ["Photograph what you own.", "We read colour, cut and occasion.", "Every morning, an outfit that's yours."];
const TILES = ["sw-camel", "sw-navy", "sw-cream", "sw-black", "sw-olive", "sw-beige"];

export default function Welcome() {
  return (
    <Guard need="signed-out">
      <div className="relative flex min-h-dvh flex-col overflow-hidden px-6 pt-safe pb-[max(2rem,env(safe-area-inset-bottom))] md:px-16">
        {/* Fabric swatch wall: abstract, quiet, and it never needs stock photos. */}
        <div aria-hidden className="pointer-events-none absolute -top-10 -right-24 grid rotate-[-8deg] grid-cols-3 gap-3 opacity-90 md:top-10 md:right-10">
          {TILES.map((t, i) => (
            <motion.div key={t} className={`h-36 w-24 rounded-lg shadow-card md:h-52 md:w-36 ${t}`}
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: i % 2 ? 24 : 0 }} transition={{ duration: 1, delay: 0.1 + i * 0.08, ease: EASE }} />
          ))}
        </div>

        <header className="relative z-10 pt-6 font-display text-[1.5rem] font-semibold tracking-tight">Styl</header>

        <div className="relative z-10 mt-auto max-w-xl">
          <motion.p className="text-label uppercase text-champagne-ink" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            A private wardrobe
          </motion.p>
          <h1 className="mt-4 font-display text-[2.75rem] leading-[1.02] tracking-[-0.04em] md:text-[4.5rem]">
            {["Dress well,", "without", "thinking."].map((w, i) => (
              <span key={w} className="block overflow-hidden">
                <motion.span className={`block ${i === 2 ? "text-champagne-ink" : ""}`} initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.35 + i * 0.1, ease: EASE }}>{w}</motion.span>
              </span>
            ))}
          </h1>
          <ul className="mt-8 flex flex-col gap-3 text-ink-2">
            {LINES.map((l, i) => (
              <motion.li key={l} className="flex items-baseline gap-3" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + i * 0.1, ease: EASE }}>
                <span className="font-display text-caption text-ink-3">0{i + 1}</span>{l}
              </motion.li>
            ))}
          </ul>
          <motion.div className="mt-10 flex flex-col gap-3 sm:flex-row" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, ease: EASE }}>
            <Link href="/login?new=1" className="inline-flex h-13 items-center justify-center rounded-full bg-ink px-8 font-medium text-on-ink transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]">Create your wardrobe</Link>
            <Link href="/login" className="inline-flex h-13 items-center justify-center rounded-full px-8 font-medium text-ink transition-colors hover:bg-stone">I have an account</Link>
          </motion.div>
        </div>
      </div>
    </Guard>
  );
}
