"use client";

import { useEffect, useRef, useState } from "react";
import { useDestinationImage } from "@/lib/destination-image";
import { cn } from "@/lib/utils";

interface DestinationCoverProps {
  place: string;
  src?: string | null;
  className?: string;
  children?: React.ReactNode;
}

/** Destination photo with a warm gradient fallback and a legibility scrim. */
export function DestinationCover({ place, src, className, children }: DestinationCoverProps) {
  const looked = useDestinationImage(src ? undefined : place);
  const url = src ?? looked;
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Cached images can finish loading before React attaches onLoad, so check on mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setIsLoaded(true);
  }, [url]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-[#0b3d59] via-[#4b5b8c] to-[#ee5a36]",
        className,
      )}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={url}
          alt=""
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-all duration-700",
            isLoaded ? "scale-100 opacity-100" : "scale-105 opacity-0",
          )}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
