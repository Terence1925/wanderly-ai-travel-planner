"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { CalendarDays, Minus, Plus, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { DestinationCover } from "@/components/destination-cover";
import { addDays } from "@/lib/itinerary";
import { setPendingRequest } from "@/lib/trips/pending";
import {
  BUDGET_LEVELS,
  MAX_TRIP_DAYS,
  PACES,
  TRAVEL_STYLES,
  tripLength,
  tripRequestSchema,
  type TripRequest,
  type TripRequestInput,
} from "@/lib/schema";
import { cn } from "@/lib/utils";

const POPULAR = ["Kyoto", "Paris", "Bali", "Lisbon", "New York", "Cape Town", "Seoul", "Palawan"];
// Demo mode can only replay the hand-made samples, so only offer those.
const DEMO_DESTINATIONS = ["Kyoto", "Paris", "Bali"];

const BUDGET_LABELS: Record<(typeof BUDGET_LEVELS)[number], { label: string; hint: string }> = {
  budget: { label: "Budget", hint: "Hostels & street food" },
  moderate: { label: "Moderate", hint: "Boutique & bistros" },
  luxury: { label: "Luxury", hint: "Five-star & fine dining" },
};

const PACE_LABELS: Record<(typeof PACES)[number], string> = {
  relaxed: "Relaxed",
  balanced: "Balanced",
  packed: "Packed",
};

const STYLE_EMOJI: Record<(typeof TRAVEL_STYLES)[number], string> = {
  food: "🍜",
  culture: "🏛️",
  nature: "🌿",
  nightlife: "🍸",
  adventure: "🧗",
  relaxation: "🧘",
  shopping: "🛍️",
  history: "📜",
};

/** Pulls a destination out of free text like "4 days in Kyoto with my partner". */
function guessDestination(text: string): string {
  const match = text.match(/\b(?:in|to|around)\s+([A-Z][\p{L}'-]*(?:\s+[A-Z][\p{L}'-]*)*)/u);
  return match?.[1] ?? "";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  render,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  render: (v: T) => React.ReactNode;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-muted p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-xl px-3 py-2 text-sm transition-all",
            value === o ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {render(o)}
        </button>
      ))}
    </div>
  );
}

export function TripWizard({ isDemo }: { isDemo: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [isSubmitting, setIsSubmitting] = useState(false);

  const start = addDays(today(), 30);
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TripRequestInput, unknown, TripRequest>({
    resolver: zodResolver(tripRequestSchema),
    defaultValues: {
      destination: guessDestination(q),
      startDate: start,
      endDate: addDays(start, 3),
      travelers: 2,
      budget: "moderate",
      styles: ["food", "culture"],
      pace: "balanced",
      notes: q,
    },
  });

  const destination = watch("destination");
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const [coverPlace, setCoverPlace] = useState(destination);

  // Debounce photo lookups while the user types.
  useEffect(() => {
    const t = setTimeout(() => setCoverPlace(destination), 500);
    return () => clearTimeout(t);
  }, [destination]);

  const days = startDate && endDate && endDate >= startDate ? tripLength(startDate, endDate) : 0;

  const onSubmit = (data: TripRequest) => {
    setIsSubmitting(true);
    setPendingRequest(data);
    router.push("/trip/new");
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:py-14">
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-8 rounded-[32px] border border-border bg-card p-6 shadow-xl shadow-primary/5 sm:p-10"
      >
        <div>
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Plan your trip</h1>
          <p className="mt-2 text-muted-foreground">A few details and Wanderly does the rest.</p>
        </div>

        {isDemo && (
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            <strong>Demo mode:</strong> AI generation isn&apos;t connected on this site, so you&apos;ll get one of the
            hand-made sample trips (Kyoto, Paris or Bali). Any other destination shows the Kyoto sample.
          </p>
        )}

        <Field label="Where to?" htmlFor="destination" error={errors.destination?.message}>
          <Input id="destination" placeholder="City, region or country" autoComplete="off" {...register("destination")} />
          <div className="flex flex-wrap gap-2 pt-1">
            {(isDemo ? DEMO_DESTINATIONS : POPULAR).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setValue("destination", p, { shouldValidate: true })}
                className={cn(
                  "rounded-full border border-border px-3 py-1 text-xs transition-colors hover:border-accent hover:text-accent",
                  destination === p && "border-accent bg-accent/10 text-accent",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Start date" htmlFor="startDate" error={errors.startDate?.message}>
            <Input id="startDate" type="date" min={today()} {...register("startDate")} />
          </Field>
          <Field
            label="End date"
            htmlFor="endDate"
            error={errors.endDate?.message}
            hint={days ? `${days} day${days > 1 ? "s" : ""} · up to ${MAX_TRIP_DAYS}` : undefined}
          >
            <Input id="endDate" type="date" min={startDate} {...register("endDate")} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
          <Field label="Travellers">
            <Controller
              control={control}
              name="travelers"
              render={({ field }) => (
                <div className="flex h-11 items-center justify-between rounded-xl border border-border px-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Fewer travellers"
                    onClick={() => field.onChange(Math.max(1, (field.value ?? 1) - 1))}
                  >
                    <Minus />
                  </Button>
                  <span className="flex items-center gap-1.5 text-sm font-medium" aria-live="polite">
                    <Users className="size-4 text-muted-foreground" /> {field.value}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="More travellers"
                    onClick={() => field.onChange(Math.min(12, (field.value ?? 1) + 1))}
                  >
                    <Plus />
                  </Button>
                </div>
              )}
            />
          </Field>
          <Field label="Budget">
            <Controller
              control={control}
              name="budget"
              render={({ field }) => (
                <Segmented
                  label="Budget"
                  options={BUDGET_LEVELS}
                  value={field.value}
                  onChange={field.onChange}
                  render={(o) => BUDGET_LABELS[o].label}
                />
              )}
            />
          </Field>
        </div>

        <Field label="What do you love?" hint="Pick as many as you like">
          <Controller
            control={control}
            name="styles"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {TRAVEL_STYLES.map((s) => {
                  const isOn = field.value?.includes(s) ?? false;
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={isOn}
                      onClick={() =>
                        field.onChange(isOn ? field.value?.filter((x) => x !== s) : [...(field.value ?? []), s])
                      }
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm capitalize transition-all",
                        isOn
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border hover:border-foreground/30",
                      )}
                    >
                      <span aria-hidden className="mr-1.5">{STYLE_EMOJI[s]}</span>
                      {s}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </Field>

        <Field label="Pace">
          <Controller
            control={control}
            name="pace"
            render={({ field }) => (
              <Segmented label="Pace" options={PACES} value={field.value} onChange={field.onChange} render={(o) => PACE_LABELS[o]} />
            )}
          />
        </Field>

        <Field
          label="Anything else?"
          htmlFor="notes"
          error={errors.notes?.message}
          hint="Dietary needs, must-sees, mobility, celebrations…"
        >
          <Textarea
            id="notes"
            maxLength={500}
            placeholder="e.g. It's our anniversary, we're vegetarian and we'd love one day trip outside the city."
            {...register("notes")}
          />
        </Field>

        <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isSubmitting}>
          <Sparkles /> {isSubmitting ? "Starting…" : "Generate my itinerary"}
        </Button>
      </motion.form>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <DestinationCover place={coverPlace} className="aspect-[4/5] rounded-[32px] shadow-2xl">
            <div className="flex h-full flex-col justify-end p-8 text-white">
              <p className="text-xs uppercase tracking-[0.2em] opacity-80">Your trip</p>
              <p className="font-display text-5xl leading-tight">{destination || "Somewhere wonderful"}</p>
              {days > 0 && (
                <p className="mt-3 flex items-center gap-2 text-sm opacity-90">
                  <CalendarDays className="size-4" /> {days} day{days > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </DestinationCover>
          <p className="px-2 text-xs text-muted-foreground">Photos via Wikipedia. Itineraries are AI-generated, so check opening hours before you go.</p>
        </div>
      </aside>
    </div>
  );
}
