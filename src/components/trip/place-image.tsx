"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { PlacePhoto } from "@/lib/place-photo";
import { cn } from "@/lib/utils";

interface PlaceImageProps {
  photo: PlacePhoto | null;
  isLoading: boolean;
  alt: string;
  icon: LucideIcon;
  tone: string;
  className?: string;
}

/** A place photo that fades in, with a skeleton while loading and a category tile when none exists. */
export function PlaceImage({ photo, isLoading, alt, icon: Icon, tone, className }: PlaceImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Cached images can finish loading before React attaches onLoad, so check on mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setIsLoaded(true);
  }, [photo?.url]);

  if (isLoading) return <div aria-hidden className={cn("skeleton", className)} />;

  if (!photo || hasFailed) {
    return (
      <div aria-hidden className={cn("grid place-items-center", tone, className)}>
        <Icon className="size-6 opacity-70" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={photo.url}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasFailed(true)}
        className={cn(
          "h-full w-full object-cover transition-all duration-500",
          isLoaded ? "scale-100 opacity-100" : "scale-105 opacity-0",
        )}
      />
    </div>
  );
}
