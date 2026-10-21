"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";

export interface PlaybackStop {
  id: string;
  lat: number;
  lng: number;
  day: number;
}

interface PlaybackOptions {
  mapRef: RefObject<MapRef | null>;
  stops: PlaybackStop[];
  onSelect?: (id: string | null) => void;
  onFinish: () => void;
}

const FLIGHT_MS = 2600;
const HOLD_MS = 1800;
const PLAY_ZOOM = 15.6;
const PLAY_PITCH = 58;

/**
 * Cinematic tour: flies a tilted camera from stop to stop, selecting each one so the
 * timeline highlights and scrolls along. Any manual map gesture pauses it.
 */
export function useTripPlayback({ mapRef, stops, onSelect, onFinish }: PlaybackOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [index, setIndex] = useState(0);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setIndex(0);
    onSelect?.(null);
    mapRef.current?.easeTo({ pitch: 0, bearing: 0, duration: 900 });
    onFinish();
  }, [mapRef, onSelect, onFinish]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);

  useEffect(() => {
    if (!isPlaying) return;
    const current = stops[index];
    if (!current) {
      stop();
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mapRef.current?.flyTo({
      center: [current.lng, current.lat],
      zoom: PLAY_ZOOM,
      pitch: reduceMotion ? 0 : PLAY_PITCH,
      // Gently orbit as the tour progresses, for a drone-shot feel.
      bearing: reduceMotion ? 0 : -25 + (index % 5) * 14,
      duration: reduceMotion ? 0 : FLIGHT_MS,
      essential: true,
    });
    onSelect?.(current.id);
    document
      .getElementById(`activity-${current.id}`)
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });

    const timer = setTimeout(() => setIndex((i) => i + 1), (reduceMotion ? 0 : FLIGHT_MS) + HOLD_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, index, stops, mapRef, onSelect, stop]);

  // Restart from the top if the set of stops changes (e.g. a different day is focused).
  const stopsKey = stops.map((s) => s.id).join("|");
  useEffect(() => {
    setIndex(0);
    setIsPlaying(false);
  }, [stopsKey]);

  return { isPlaying, index, total: stops.length, current: stops[index], play, pause, stop };
}
