"use client";

import { useEffect, useRef } from "react";
import createGlobe, { type Arc, type Marker } from "cobe";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type LatLng = [number, number];

const HUB: LatLng = [14.5995, 120.9842]; // Manila
const DESTINATIONS: LatLng[] = [
  [35.0116, 135.7681], // Kyoto
  [48.8566, 2.3522], // Paris
  [-8.4095, 115.1889], // Bali
  [11.9674, 121.9248], // Boracay
  [38.7223, -9.1393], // Lisbon
  [40.7128, -74.006], // New York
  [-33.9249, 18.4241], // Cape Town
  [37.5665, 126.978], // Seoul
  [-33.8688, 151.2093], // Sydney
];

const MARKERS: Marker[] = [
  { location: HUB, size: 0.05 },
  ...DESTINATIONS.map((location) => ({ location, size: 0.03 })),
];
const ARCS: Arc[] = DESTINATIONS.filter((_, i) => i !== 3).map((to) => ({ from: HUB, to }));

/** Starting rotation that faces Asia–Pacific, where the arcs originate. */
const START_PHI = 4.2;
const SPIN_PER_FRAME = 0.0025;

export function Globe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; phi: number } | null>(null);
  const phiRef = useRef(START_PHI);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => canvas.offsetWidth * dpr;
    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size(),
      height: size(),
      phi: phiRef.current,
      theta: 0.25,
      dark: isDark ? 1 : 0,
      diffuse: isDark ? 1.4 : 1.2,
      mapSamples: 16000,
      mapBrightness: isDark ? 9 : 8,
      mapBaseBrightness: isDark ? 0.05 : 0,
      baseColor: isDark ? [0.32, 0.42, 0.6] : [0.96, 0.93, 0.88],
      markerColor: [0.93, 0.35, 0.21],
      glowColor: isDark ? [0.2, 0.3, 0.5] : [1, 0.9, 0.85],
      arcColor: [0.93, 0.35, 0.21],
      arcWidth: 0.4,
      arcHeight: 0.25,
      markers: MARKERS,
      arcs: ARCS,
      opacity: isDark ? 0.9 : 1,
    });

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isVisible = true;
    let frame = 0;
    const tick = () => {
      if (isVisible && !dragRef.current && !reduceMotion) phiRef.current += SPIN_PER_FRAME;
      globe.update({ phi: phiRef.current, width: size(), height: size() });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    // Stop spending GPU time when the hero is scrolled out of view.
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = Boolean(entry?.isIntersecting);
    });
    observer.observe(canvas);

    requestAnimationFrame(() => canvas.classList.add("opacity-100"));

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      globe.destroy();
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      onPointerDown={(e) => {
        dragRef.current = { x: e.clientX, phi: phiRef.current };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (dragRef.current) phiRef.current = dragRef.current.phi + (e.clientX - dragRef.current.x) / 200;
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      className={cn(
        "aspect-square w-full cursor-grab touch-pan-y opacity-0 transition-opacity duration-1000 active:cursor-grabbing",
        className,
      )}
    />
  );
}
