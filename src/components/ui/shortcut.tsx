import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ShortcutProps = ButtonHTMLAttributes<HTMLButtonElement> & { icon: ReactNode; label: string; active?: boolean; count?: number };

/** Round icon + caption, the "Sort · Filter · Liked" row from closet apps. Toggles show state by filling white. */
export function Shortcut({ icon, label, active, count, className, ...rest }: ShortcutProps) {
  return (
    <button type="button" {...rest} className={cn("group flex w-16 shrink-0 flex-col items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40", className)}>
      <span className={cn("relative flex size-12 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] duration-200 group-active:scale-90",
        active ? "border-ink bg-ink text-on-ink" : "border-line bg-surface text-ink group-hover:border-ink-3")}>
        {icon}
        {!!count && <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-champagne text-[10px] font-bold text-on-ink tabular-nums">{count}</span>}
      </span>
      <span className={cn("text-[12px] transition-colors", active ? "font-medium text-ink" : "text-ink-3 group-hover:text-ink-2")}>{label}</span>
    </button>
  );
}
