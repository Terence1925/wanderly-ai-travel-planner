"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { dayColor } from "@/lib/categories";
import { moveActivity, removeActivity, reorderActivities } from "@/lib/itinerary";
import type { Activity, Day } from "@/lib/schema";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { useTripStore } from "@/store/trip-store";
import { ActivityCard } from "./activity-card";
import { AddActivityDialog } from "./add-activity-dialog";

interface SortableItemProps {
  activity: Activity;
  index: number;
  day: Day;
  dayNumbers: number[];
  currency: string;
  canEdit: boolean;
}

function SortableActivity({ activity, index, day, dayNumbers, currency, canEdit }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
    disabled: !canEdit,
  });
  const selectedId = useTripStore((s) => s.selectedActivityId);
  const { edit, selectActivity, undo } = useTripStore.getState();

  return (
    <ActivityCard
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      isDragging={isDragging}
      dragHandleProps={{ ...attributes, ...listeners }}
      activity={activity}
      index={index}
      color={dayColor(day.day)}
      currency={currency}
      isSelected={selectedId === activity.id}
      canEdit={canEdit}
      days={dayNumbers}
      currentDay={day.day}
      onSelect={() => selectActivity(selectedId === activity.id ? null : activity.id)}
      onRemove={() => {
        edit((it) => removeActivity(it, activity.id));
        toast(`Removed “${activity.title}”`, { action: { label: "Undo", onClick: undo } });
      }}
      onMove={(to) => {
        edit((it) => moveActivity(it, activity.id, to));
        toast(`Moved to day ${to}`, { action: { label: "Undo", onClick: undo } });
      }}
    />
  );
}

function DaySection({ day, dayNumbers, currency, canEdit, isGenerating }: {
  day: Day;
  dayNumbers: number[];
  currency: string;
  canEdit: boolean;
  isGenerating: boolean;
}) {
  const edit = useTripStore((s) => s.edit);
  const focusedDay = useTripStore((s) => s.focusedDay);
  const focusDay = useTripStore((s) => s.focusDay);
  const isChanged = useTripStore((s) => s.changedDays.includes(day.day));
  const [isAdding, setIsAdding] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const dayCost = day.activities.reduce((sum, a) => sum + a.cost, 0);
  const color = dayColor(day.day);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = day.activities.findIndex((a) => a.id === active.id);
    const to = day.activities.findIndex((a) => a.id === over.id);
    if (from >= 0 && to >= 0) edit((it) => reorderActivities(it, day.day, from, to));
  };

  return (
    <section
      id={`day-${day.day}`}
      aria-labelledby={`day-${day.day}-title`}
      className={cn(
        "scroll-mt-40 rounded-3xl p-1 transition-colors duration-700",
        isChanged && "bg-accent/8 ring-1 ring-accent/30",
      )}
    >
      <header className="mb-4 flex items-end justify-between gap-3 px-1">
        <button
          type="button"
          onClick={() => focusDay(focusedDay === day.day ? null : day.day)}
          className="group text-left"
          aria-pressed={focusedDay === day.day}
          title="Show only this day on the map"
        >
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color }}>
            <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
            Day {day.day} · {formatDate(day.date)}
            {isChanged && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">Updated</span>}
          </p>
          <h3 id={`day-${day.day}-title`} className="mt-1 font-display text-2xl leading-tight group-hover:underline decoration-1 underline-offset-4">
            {day.title}
          </h3>
          {day.summary && <p className="mt-1 text-sm text-muted-foreground">{day.summary}</p>}
        </button>
        {dayCost > 0 && (
          <p className="shrink-0 text-right text-xs text-muted-foreground">
            Activities
            <span className="block text-sm font-semibold text-foreground">{formatMoney(dayCost, currency)}</span>
          </p>
        )}
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={day.activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-border">
            {day.activities.map((a, i) => (
              <SortableActivity
                key={a.id}
                activity={a}
                index={i}
                day={day}
                dayNumbers={dayNumbers}
                currency={currency}
                canEdit={canEdit}
              />
            ))}
            {isGenerating && (
              <li className="pl-12" aria-hidden>
                <div className="skeleton h-24 rounded-2xl" />
              </li>
            )}
          </ol>
        </SortableContext>
      </DndContext>

      {canEdit && (
        <div className="mt-3 pl-12">
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)} className="text-muted-foreground">
            <Plus /> Add activity
          </Button>
        </div>
      )}
      <AddActivityDialog open={isAdding} onClose={() => setIsAdding(false)} day={day} />
    </section>
  );
}

export function Timeline({ canEdit }: { canEdit: boolean }) {
  const itinerary = useTripStore((s) => s.trip?.itinerary);
  const status = useTripStore((s) => s.status);
  if (!itinerary) return null;

  const isGenerating = status === "generating";
  const dayNumbers = itinerary.days.map((d) => d.day);
  const lastDay = itinerary.days.at(-1)?.day;

  return (
    <div className="space-y-10">
      {itinerary.days.map((day) => (
        <DaySection
          key={day.day}
          day={day}
          dayNumbers={dayNumbers}
          currency={itinerary.currency}
          canEdit={canEdit && !isGenerating}
          isGenerating={isGenerating && day.day === lastDay}
        />
      ))}
      {isGenerating && itinerary.days.length === 0 && (
        <div className="space-y-3" aria-hidden>
          <div className="skeleton h-6 w-40 rounded-full" />
          <div className="skeleton h-8 w-72 rounded-full" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton ml-12 h-24 rounded-2xl" />
          ))}
        </div>
      )}
    </div>
  );
}
