"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { IconButton } from "./icon-button";

type BottomSheetProps = { open: boolean; onClose: () => void; title: string; children: ReactNode };

const EASE = [0.22, 1, 0.36, 1] as const;

/** Native <dialog> (focus trap, Esc, inert page) + motion: slides up, drag down to dismiss on phones. */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { setClosing(false); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);

  const requestClose = () => setClosing(true);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); requestClose(); }}
      onClick={(e) => e.target === e.currentTarget && requestClose()}
      aria-label={title}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-visible bg-transparent p-0 backdrop:bg-scrim backdrop:backdrop-blur-[2px] md:m-auto md:max-w-md"
    >
      {open && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { y: "100%" }}
          animate={closing ? (reduce ? { opacity: 0 } : { y: "100%" }) : reduce ? { opacity: 1 } : { y: 0 }}
          transition={{ duration: closing ? 0.22 : 0.42, ease: EASE }}
          onAnimationComplete={() => closing && onClose()}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, i) => (i.offset.y > 90 || i.velocity.y > 500) && requestClose()}
          className="max-h-[92dvh] overflow-y-auto rounded-t-xl bg-surface pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-float md:rounded-xl md:pb-6"
        >
          <div className="mx-auto mt-2.5 h-1 w-10 cursor-grab rounded-full bg-line md:hidden" aria-hidden />
          <div className="flex items-center justify-between px-6 pt-3 pb-2">
            <h2 className="font-display text-heading">{title}</h2>
            <IconButton label="Close" icon={<X className="size-5" />} onClick={requestClose} className="-mr-2" />
          </div>
          <div className="px-6">{children}</div>
        </motion.div>
      )}
    </dialog>
  );
}
