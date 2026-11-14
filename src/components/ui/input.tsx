import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Input({ label, hint, error, className, ...rest }: InputProps) {
  const id = useId();
  const note = error ?? hint;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label uppercase text-ink-3">{label}</label>
      <input
        id={id}
        {...rest}
        aria-invalid={!!error || undefined}
        aria-describedby={note ? `${id}-note` : undefined}
        className={cn(
          "h-12 rounded-md border bg-surface px-4 text-body text-ink placeholder:text-ink-3",
          "transition-colors duration-200 hover:border-ink-3 focus:border-ink focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-danger" : "border-line",
        )}
      />
      {note && <p id={`${id}-note`} className={cn("text-caption", error ? "text-danger" : "text-ink-3")}>{note}</p>}
    </div>
  );
}
