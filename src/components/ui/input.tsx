"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Input({ label, hint, error, className, type, ...rest }: InputProps) {
  const id = useId();
  const note = error ?? hint;
  const isPassword = type === "password";
  const [shown, setShown] = useState(false);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label uppercase text-ink-3">{label}</label>
      <div className="relative">
        <input
          id={id}
          {...rest}
          type={isPassword && shown ? "text" : type}
          aria-invalid={!!error || undefined}
          aria-describedby={note ? `${id}-note` : undefined}
          className={cn(
            "h-13 w-full rounded-md border bg-stone px-4 text-body text-ink placeholder:text-ink-3",
            "transition-colors duration-200 hover:border-line focus:border-ink-3 focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isPassword && "pr-12",
            error ? "border-danger" : "border-transparent",
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            aria-controls={id}
            disabled={rest.disabled}
            className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-line hover:text-ink disabled:opacity-40"
          >
            {shown ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
          </button>
        )}
      </div>
      {note && <p id={`${id}-note`} className={cn("text-caption", error ? "text-danger" : "text-ink-3")}>{note}</p>}
    </div>
  );
}
