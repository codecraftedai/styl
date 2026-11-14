"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

type ItemImageProps = { src?: string; alt: string; layoutId?: string; className?: string; fit?: "cover" | "contain" | "natural" };

/** Photo on the studio backdrop; fades in when decoded so the grid never pops. Plain <img>: photos are already resized WebP behind signed URLs. */
export function ItemImage({ src, alt, layoutId, className, fit = "natural" }: ItemImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <motion.div layoutId={layoutId} className={cn("relative overflow-hidden bg-studio", !loaded && "skeleton", className)}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" draggable={false} onLoad={() => setLoaded(true)}
          className={cn("transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0",
            fit === "natural" ? "block h-auto min-h-24 w-full" : cn("absolute inset-0 size-full", fit === "cover" ? "object-cover" : "object-contain"))} />
      )}
    </motion.div>
  );
}
