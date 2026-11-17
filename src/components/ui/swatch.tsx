import { colourById } from "@/lib/colours";
import { cn } from "@/lib/cn";

export function Swatch({ id, className }: { id: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-3.5 shrink-0 rounded-full ring-1 ring-white/15", `sw-${id}`, className)} title={colourById(id)?.label} />;
}
