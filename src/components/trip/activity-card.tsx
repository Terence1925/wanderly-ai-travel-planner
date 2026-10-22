"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { motion } from "framer-motion";
import { Clock, GripVertical, Lightbulb, MoreHorizontal, Trash2 } from "lucide-react";
import { CATEGORY_META } from "@/lib/categories";
import type { Activity } from "@/lib/schema";
import { usePlacePhoto } from "@/lib/use-place-photo";
import { cn, formatDuration, formatMoney } from "@/lib/utils";
import { PlaceImage } from "./place-image";

interface ActivityCardProps {
  activity: Activity;
  index: number;
  color: string;
  currency: string;
  /** City or region name, used to find the right photo for this stop. */
  destination: string;
  isSelected: boolean;
  canEdit: boolean;
  days: number[];
  currentDay: number;
  onSelect: () => void;
  onRemove: () => void;
  onMove: (day: number) => void;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  style?: React.CSSProperties;
  isDragging?: boolean;
}

export const ActivityCard = forwardRef<HTMLLIElement, ActivityCardProps>(function ActivityCard(
  {
    activity: a,
    index,
    color,
    currency,
    destination,
    isSelected,
    canEdit,
    days,
    currentDay,
    onSelect,
    onRemove,
    onMove,
    dragHandleProps,
    style,
    isDragging,
  },
  ref,
) {
  const meta = CATEGORY_META[a.category];
  const Icon = meta.icon;
  const { ref: photoRef, photo, isLoading } = usePlacePhoto<HTMLElement>(a.title, destination);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.title} ${a.lat},${a.lng}`)}`;

  return (
    <motion.li
      ref={ref}
      id={`activity-${a.id}`}
      style={style}
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={cn("relative scroll-mt-48 pl-12", isDragging && "z-10 opacity-80")}
    >
      <span
        className="absolute left-0 top-4 grid size-8 place-items-center rounded-full text-xs font-bold text-white shadow-md ring-4 ring-background"
        style={{ backgroundColor: color }}
        aria-hidden
      >
        {index + 1}
      </span>
      <article
        ref={photoRef}
        onClick={onSelect}
        className={cn(
          "group cursor-pointer rounded-2xl border bg-card p-4 transition-all hover:shadow-lg hover:shadow-primary/5",
          isSelected ? "border-accent shadow-lg shadow-accent/10 ring-1 ring-accent/40" : "border-border",
        )}
      >
        {isSelected && photo && (
          <figure className="mb-4 overflow-hidden rounded-xl">
            <PlaceImage
              photo={photo}
              isLoading={false}
              alt={a.title}
              icon={Icon}
              tone={meta.tone}
              className="aspect-[16/9] w-full rounded-xl"
            />
            <figcaption className="mt-1.5 text-[11px] text-muted-foreground">
              Photo:{" "}
              <a
                href={photo.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="underline hover:text-foreground"
              >
                {photo.pageTitle}, Wikipedia
              </a>
            </figcaption>
          </figure>
        )}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{a.time}</span>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", meta.tone)}>
                <Icon className="size-3" /> {meta.label}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" /> {formatDuration(a.durationMin)}
              </span>
              <span className="font-medium text-foreground/80">
                {a.cost > 0 ? formatMoney(a.cost, currency) : "Free"}
              </span>
            </div>
            <h4 className="font-semibold leading-snug">{a.title}</h4>
            <p className={cn("mt-1 text-sm leading-relaxed text-muted-foreground", !isSelected && "line-clamp-2")}>
              {a.description}
            </p>
            {isSelected && (
              <div className="mt-3 space-y-2 text-sm">
                {a.tip && (
                  <p className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
                    <Lightbulb className="mt-0.5 size-4 shrink-0" /> {a.tip}
                  </p>
                )}
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-block text-xs font-medium text-accent hover:underline"
                >
                  Open in Google Maps ↗
                </a>
              </div>
            )}
          </div>

          {!(isSelected && photo) && (
            <PlaceImage
              photo={photo}
              isLoading={isLoading}
              alt=""
              icon={Icon}
              tone={meta.tone}
              className="size-16 shrink-0 rounded-xl sm:size-24"
            />
          )}

          {canEdit && (
            <div className="no-print flex shrink-0 flex-col items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <button
                {...dragHandleProps}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Reorder ${a.title}`}
                className="cursor-grab touch-none rounded-lg p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
              >
                <GripVertical className="size-4" />
              </button>
              <details className="relative" onClick={(e) => e.stopPropagation()}>
                <summary
                  aria-label={`More actions for ${a.title}`}
                  className="list-none rounded-lg p-1 text-muted-foreground hover:bg-muted [&::-webkit-details-marker]:hidden"
                >
                  <MoreHorizontal className="size-4" />
                </summary>
                <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-border bg-card p-1 shadow-xl">
                  {days
                    .filter((d) => d !== currentDay)
                    .map((d) => (
                      <button
                        key={d}
                        onClick={() => onMove(d)}
                        className="block w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-muted"
                      >
                        Move to day {d}
                      </button>
                    ))}
                  <button
                    onClick={onRemove}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </button>
                </div>
              </details>
            </div>
          )}
        </div>
      </article>
    </motion.li>
  );
});
