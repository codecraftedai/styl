import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  tone?: "plain" | "glass";
  pressed?: boolean;
};

/** 44px square hit area for touch; `label` is required so every icon is announced. */
export function IconButton({ label, icon, tone = "plain", pressed, className, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink",
        "transition-[background-color,transform] duration-200 active:scale-95 disabled:opacity-40",
        tone === "plain" ? "hover:bg-stone" : "bg-surface/80 backdrop-blur hover:bg-surface",
        className,
      )}
    >
      {icon}
    </button>
  );
}
