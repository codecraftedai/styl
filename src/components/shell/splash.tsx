"use client";

import { motion } from "motion/react";

export function Splash() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ivory" role="status" aria-label="Loading">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="text-center">
        <p className="font-display text-[2.75rem] leading-none font-semibold tracking-[-0.04em]">Styl</p>
        <motion.div className="mx-auto mt-4 h-px bg-ink" initial={{ width: 0 }} animate={{ width: 48 }} transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} />
      </motion.div>
    </div>
  );
}
