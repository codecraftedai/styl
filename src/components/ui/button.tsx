import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
};

const variants: Record<Variant, string> = {
  primary: "bg-ink text-on-ink hover:opacity-90",
  secondary: "bg-surface text-ink border border-line hover:border-ink-3",
  ghost: "text-ink hover:bg-stone",
  danger: "bg-surface text-danger border border-line hover:border-danger",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-body",
  lg: "h-13 px-7 text-body",
};

export function Button({ variant = "primary", size = "md", loading, block, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-wide",
        "transition-[opacity,transform,border-color,background-color] duration-200 active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
