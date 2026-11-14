import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean };

/** Toggle chip for categories and filters. 36px tall, 44px hit area via padding. */
export function Chip({ selected, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...rest}
      className={cn(
        "h-9 shrink-0 rounded-full border px-4 text-caption font-medium whitespace-nowrap",
        "transition-colors duration-200 active:scale-[0.97] disabled:opacity-40",
        selected ? "border-ink bg-ink text-on-ink" : "border-line bg-surface text-ink-2 hover:border-ink-3 hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
