"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { CATEGORY_META } from "@/lib/categories";
import { addActivity, newId } from "@/lib/itinerary";
import { CATEGORIES, activitySchema, type Activity, type Day } from "@/lib/schema";
import { useTripStore } from "@/store/trip-store";

interface AddActivityDialogProps {
  open: boolean;
  onClose: () => void;
  day: Day;
}

export function AddActivityDialog({ open, onClose, day }: AddActivityDialogProps) {
  const edit = useTripStore((s) => s.edit);
  const currency = useTripStore((s) => s.trip?.itinerary.currency ?? "USD");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // New stops default to the centroid of the day so they appear near the rest on the map.
    const anchor = day.activities.length
      ? {
          lat: day.activities.reduce((s, a) => s + a.lat, 0) / day.activities.length,
          lng: day.activities.reduce((s, a) => s + a.lng, 0) / day.activities.length,
        }
      : useTripStore.getState().trip?.itinerary.destination ?? { lat: 0, lng: 0 };

    const parsed = activitySchema.safeParse({
      id: newId(),
      time: form.get("time"),
      title: form.get("title"),
      description: form.get("description") ?? "",
      category: form.get("category"),
      durationMin: Number(form.get("duration")),
      cost: Number(form.get("cost") || 0),
      lat: anchor.lat,
      lng: anchor.lng,
      address: "",
      tip: "",
    } satisfies Record<keyof Activity, unknown>);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the fields");
      return;
    }
    edit((it) => addActivity(it, day.day, parsed.data));
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Add to day ${day.day}`} description={day.title}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="What" htmlFor="act-title">
          <Input id="act-title" name="title" required maxLength={120} placeholder="Sunset at the harbour" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Time" htmlFor="act-time">
            <Input id="act-time" name="time" type="time" required defaultValue="12:00" />
          </Field>
          <Field label="Duration (min)" htmlFor="act-duration">
            <Input id="act-duration" name="duration" type="number" min={0} max={1440} defaultValue={60} />
          </Field>
          <Field label="Category" htmlFor="act-category">
            <select
              id="act-category"
              name="category"
              defaultValue="sightseeing"
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Cost (${currency})`} htmlFor="act-cost">
            <Input id="act-cost" name="cost" type="number" min={0} step="any" defaultValue={0} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="act-desc">
          <Textarea id="act-desc" name="description" maxLength={600} className="min-h-20" />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent">
            Add activity
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
