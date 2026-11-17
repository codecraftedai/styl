import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  tone?: "plain" | "filled" | "glass";
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
        "transition-[background-color,border-color,transform] duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
        tone === "plain" ? "hover:bg-stone" : tone === "filled" ? "border border-line bg-stone hover:bg-line" : "border border-white/10 bg-black/40 backdrop-blur-md hover:bg-black/60",
        className,
      )}
    >
      {icon}
    </button>
  );
}
