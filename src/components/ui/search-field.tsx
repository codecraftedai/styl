import type { InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  value: string;
  onClear: () => void;
};

export function SearchField({ value, onClear, ...rest }: SearchFieldProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        type="search"
        aria-label="Search wardrobe"
        value={value}
        {...rest}
        className="h-12 w-full rounded-full border border-line bg-surface pr-12 pl-11 text-body placeholder:text-ink-3 hover:border-ink-3 focus:border-ink focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={onClear} aria-label="Clear search" className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 hover:bg-stone hover:text-ink">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
