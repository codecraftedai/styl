import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean };

/** Outline pill for categories and filters (40px). Selected flips to a solid white pill. */
export function Chip({ selected, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...rest}
      className={cn(
        "h-10 shrink-0 rounded-full border px-5 text-caption font-medium whitespace-nowrap",
        "transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
        selected ? "border-ink bg-ink text-on-ink" : "border-line bg-transparent text-ink-2 hover:border-ink-3 hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
