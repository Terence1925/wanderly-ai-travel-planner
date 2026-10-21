"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Itinerary } from "@/lib/schema";

const TripMap = dynamic(() => import("./trip-map"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

/** Client wrapper so server-rendered pages can embed the interactive map. */
export function PublicMap({ itinerary }: { itinerary: Itinerary }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return <TripMap itinerary={itinerary} selectedId={selectedId} onSelect={setSelectedId} />;
}
