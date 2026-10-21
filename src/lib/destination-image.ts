"use client";

import { useEffect, useState } from "react";

const cache = new Map<string, string | null>();

/**
 * Looks up a lead photo for a place from Wikipedia's free REST API.
 * Returns null when nothing is found, so callers can fall back to a gradient.
 */
export async function fetchDestinationImage(place: string): Promise<string | null> {
  const key = place.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place.trim())}`,
    );
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as {
      originalimage?: { source: string };
      thumbnail?: { source: string };
    };
    const url = data.originalimage?.source ?? data.thumbnail?.source ?? null;
    cache.set(key, url);
    return url;
  } catch {
    cache.set(key, null);
    return null;
  }
}

export function useDestinationImage(place: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let isActive = true;
    if (place) fetchDestinationImage(place).then((u) => isActive && setUrl(u));
    return () => {
      isActive = false;
    };
  }, [place]);
  return url;
}
