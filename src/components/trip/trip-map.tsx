"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { setWorkerUrl } from "maplibre-gl";
import Map, { Layer, Marker, NavigationControl, Popup, Source, type MapRef } from "react-map-gl/maplibre";
import type { FeatureCollection, LineString } from "geojson";
import { dayColor } from "@/lib/categories";
import type { Itinerary } from "@/lib/schema";
import { cn, formatDuration } from "@/lib/utils";

// Copied into /public by scripts/copy-maplibre-worker.mjs (see the comment there).
// Must be absolute: MapLibre may bootstrap it from a blob: URL, where relative paths don't resolve.
// This module only loads client-side (dynamic import with ssr: false), so window exists.
setWorkerUrl(new URL("/vendor/maplibre-gl-worker.mjs", window.location.origin).href);

const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

interface TripMapProps {
  itinerary: Itinerary;
  selectedId?: string | null;
  focusedDay?: number | null;
  onSelect?: (id: string | null) => void;
  className?: string;
  interactive?: boolean;
}

export default function TripMap({
  itinerary,
  selectedId = null,
  focusedDay = null,
  onSelect,
  className,
  interactive = true,
}: TripMapProps) {
  const mapRef = useRef<MapRef>(null);
  const { resolvedTheme } = useTheme();

  const visibleDays = useMemo(
    () => itinerary.days.filter((d) => focusedDay === null || d.day === focusedDay),
    [itinerary.days, focusedDay],
  );

  const points = useMemo(
    () =>
      visibleDays.flatMap((d) =>
        d.activities.map((a, i) => ({ ...a, day: d.day, index: i + 1, color: dayColor(d.day) })),
      ),
    [visibleDays],
  );

  const routes = useMemo<FeatureCollection<LineString, { color: string }>>(
    () => ({
      type: "FeatureCollection",
      features: visibleDays
        .filter((d) => d.activities.length > 1)
        .map((d) => ({
          type: "Feature",
          properties: { color: dayColor(d.day) },
          geometry: { type: "LineString", coordinates: d.activities.map((a) => [a.lng, a.lat]) },
        })),
    }),
    [visibleDays],
  );

  // Refit when the set of stops changes (new stops streaming in, a day focused).
  const boundsKey = points.map((p) => p.id).join("|");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.flyTo({ center: [points[0]!.lng, points[0]!.lat], zoom: 14, duration: 800 });
      return;
    }
    const lngs = points.map((p) => p.lng);
    const lats = points.map((p) => p.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 64, duration: 900, maxZoom: 15 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey]);

  // Fly to the selected stop when chosen from the timeline.
  useEffect(() => {
    const p = points.find((x) => x.id === selectedId);
    if (p) mapRef.current?.easeTo({ center: [p.lng, p.lat], duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selected = points.find((p) => p.id === selectedId);
  const { destination } = itinerary;
  const hasCenter = destination.lat !== 0 || destination.lng !== 0;

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: hasCenter ? destination.lng : 0,
          latitude: hasCenter ? destination.lat : 20,
          zoom: hasCenter ? 11 : 1.5,
        }}
        mapStyle={resolvedTheme === "dark" ? STYLES.dark : STYLES.light}
        attributionControl={{ compact: true }}
        interactive={interactive}
        style={{ width: "100%", height: "100%" }}
        onClick={() => onSelect?.(null)}
      >
        {interactive && <NavigationControl position="top-right" showCompass={false} />}

        <Source id="routes" type="geojson" data={routes}>
          <Layer
            id="routes-line"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": ["get", "color"],
              "line-width": 3,
              "line-opacity": 0.75,
              "line-dasharray": [1.5, 1.5],
            }}
          />
        </Source>

        {points.map((p) => (
          <Marker
            key={p.id}
            longitude={p.lng}
            latitude={p.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelect?.(p.id);
              document.getElementById(`day-${p.day}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <button
              type="button"
              aria-label={`Day ${p.day}, stop ${p.index}: ${p.title}`}
              className={cn(
                "grid size-7 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-lg transition-transform hover:scale-125",
                p.id === selectedId && "scale-125 ring-4 ring-white/60",
              )}
              style={{ backgroundColor: p.color }}
            >
              {p.index}
            </button>
          </Marker>
        ))}

        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={18}
            closeButton={false}
            onClose={() => onSelect?.(null)}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: selected.color }}>
              Day {selected.day} · {selected.time}
            </p>
            <p className="text-sm font-semibold">{selected.title}</p>
            <p className="text-xs opacity-70">{formatDuration(selected.durationMin)}</p>
          </Popup>
        )}
      </Map>

      {itinerary.days.length > 1 && interactive && (
        <div className="pointer-events-none absolute left-3 right-14 top-3 flex flex-wrap gap-1.5">
          {itinerary.days.map((d) => (
            <span
              key={d.day}
              className={cn(
                "flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium shadow backdrop-blur",
                focusedDay !== null && focusedDay !== d.day && "opacity-40",
              )}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: dayColor(d.day) }} />
              Day {d.day}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
