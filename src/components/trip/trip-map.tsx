"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { setWorkerUrl } from "maplibre-gl";
import { Pause, Play, Square } from "lucide-react";
import Map, { Layer, Marker, NavigationControl, Popup, Source, type MapRef } from "react-map-gl/maplibre";
import type { FeatureCollection, LineString } from "geojson";
import { dayColor } from "@/lib/categories";
import type { Itinerary } from "@/lib/schema";
import { cn, formatDuration } from "@/lib/utils";
import { usePlacePhotoNow } from "@/lib/use-place-photo";
import { useTripPlayback } from "./use-trip-playback";

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

  const pointsRef = useRef(points);
  pointsRef.current = points;

  /** Frames every visible stop. Reads from a ref so its identity stays stable for playback. */
  const fitAll = useCallback(() => {
    const map = mapRef.current;
    const all = pointsRef.current;
    if (!map || all.length === 0) return;
    if (all.length === 1) {
      map.flyTo({ center: [all[0]!.lng, all[0]!.lat], zoom: 14, duration: 800 });
      return;
    }
    const lngs = all.map((p) => p.lng);
    const lats = all.map((p) => p.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 64, duration: 900, maxZoom: 15, pitch: 0, bearing: 0 },
    );
  }, []);

  const playback = useTripPlayback({ mapRef, stops: points, onSelect, onFinish: fitAll });
  const isPlayingRef = useRef(false);
  isPlayingRef.current = playback.isPlaying;

  // Refit when the set of stops changes (new stops streaming in, a day focused).
  const boundsKey = points.map((p) => p.id).join("|");
  useEffect(() => {
    if (!isPlayingRef.current) fitAll();
  }, [boundsKey, fitAll]);

  // Pan to a stop chosen from the timeline; playback drives its own camera.
  useEffect(() => {
    const p = pointsRef.current.find((x) => x.id === selectedId);
    if (p && !isPlayingRef.current) mapRef.current?.easeTo({ center: [p.lng, p.lat], duration: 600 });
  }, [selectedId]);

  const selected = points.find((p) => p.id === selectedId);
  const { destination } = itinerary;
  const selectedPhoto = usePlacePhotoNow(selected?.title, destination.name);
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
        onDragStart={(e) => e.originalEvent && playback.pause()}
        onZoomStart={(e) => e.originalEvent && playback.pause()}
      >
        {interactive && <NavigationControl position="top-right" showCompass={false} />}

        {/* Extruded buildings from the basemap tiles; they rise when the camera tilts. */}
        <Layer
          id="buildings-3d"
          type="fill-extrusion"
          source="openmaptiles"
          source-layer="building"
          minzoom={14}
          paint={{
            "fill-extrusion-color": resolvedTheme === "dark" ? "#22324c" : "#e6dccd",
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": 0.75,
          }}
        />

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
            maxWidth="240px"
          >
            {selectedPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedPhoto.url}
                alt=""
                className="-mx-1 mb-2 aspect-[16/10] w-[calc(100%+0.5rem)] max-w-none rounded-lg object-cover"
              />
            )}
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: selected.color }}>
              Day {selected.day} · {selected.time}
            </p>
            <p className="text-sm font-semibold">{selected.title}</p>
            <p className="text-xs opacity-70">{formatDuration(selected.durationMin)}</p>
          </Popup>
        )}
      </Map>

      {interactive && points.length > 1 && (
        <div className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-xl backdrop-blur lg:bottom-4">
          <button
            type="button"
            onClick={playback.isPlaying ? playback.pause : playback.play}
            aria-label={playback.isPlaying ? "Pause trip playback" : "Play trip as a fly-through"}
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-md shadow-accent/30 transition hover:brightness-110"
          >
            {playback.isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
            {playback.isPlaying ? "Pause" : playback.index > 0 ? "Resume" : "Play trip"}
          </button>
          {(playback.isPlaying || playback.index > 0) && (
            <>
              <span className="px-2 text-xs tabular-nums text-muted-foreground" aria-live="polite">
                {playback.current ? `Day ${playback.current.day} · ` : ""}
                {Math.min(playback.index + 1, playback.total)}/{playback.total}
              </span>
              <button
                type="button"
                onClick={playback.stop}
                aria-label="Stop playback"
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Square className="size-3.5 fill-current" />
              </button>
            </>
          )}
        </div>
      )}

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
