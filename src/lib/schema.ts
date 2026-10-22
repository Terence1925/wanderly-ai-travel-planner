import { z } from "zod";

export const TRAVEL_STYLES = [
  "food",
  "culture",
  "nature",
  "nightlife",
  "adventure",
  "relaxation",
  "shopping",
  "history",
] as const;

export const BUDGET_LEVELS = ["budget", "moderate", "luxury"] as const;
export const PACES = ["relaxed", "balanced", "packed"] as const;
export const CATEGORIES = [
  "sightseeing",
  "food",
  "culture",
  "nature",
  "nightlife",
  "adventure",
  "shopping",
  "relaxation",
  "transport",
  "accommodation",
] as const;

export const MAX_TRIP_DAYS = 10;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** What the user submits from the wizard. */
export const tripRequestSchema = z
  .object({
    destination: z.string().trim().min(2).max(80),
    startDate: isoDate,
    endDate: isoDate,
    travelers: z.number().int().min(1).max(12),
    budget: z.enum(BUDGET_LEVELS),
    styles: z.array(z.enum(TRAVEL_STYLES)).max(TRAVEL_STYLES.length),
    pace: z.enum(PACES),
    notes: z.string().trim().max(500).optional().default(""),
  })
  .refine((r) => r.endDate >= r.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  })
  .refine((r) => tripLength(r.startDate, r.endDate) <= MAX_TRIP_DAYS, {
    message: `Trips can be up to ${MAX_TRIP_DAYS} days`,
    path: ["endDate"],
  });

export type TripRequest = z.infer<typeof tripRequestSchema>;
export type TripRequestInput = z.input<typeof tripRequestSchema>;

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

export const activitySchema = z.object({
  id: z.string().min(1).max(64),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  title: z.string().min(1).max(120),
  description: z.string().max(600),
  category: z.enum(CATEGORIES),
  durationMin: z.number().int().min(0).max(24 * 60),
  /** Estimated cost per person in the trip currency (high cap: IDR/VND run into millions). */
  cost: z.number().min(0).max(100_000_000),
  lat,
  lng,
  address: z.string().max(200).optional().default(""),
  tip: z.string().max(300).optional().default(""),
});
export type Activity = z.infer<typeof activitySchema>;

export const daySchema = z.object({
  day: z.number().int().min(1).max(MAX_TRIP_DAYS),
  date: isoDate,
  title: z.string().max(120),
  summary: z.string().max(400).optional().default(""),
  activities: z.array(activitySchema).max(12),
});
export type Day = z.infer<typeof daySchema>;

/*
 * The "extras" (budget, packing, tips) are nice-to-have, so they're validated leniently:
 * over-long text and lists are trimmed instead of rejecting the whole line, which would
 * silently drop the budget estimate, packing list and tips together.
 */
const text = (max: number) => z.string().transform((v) => v.slice(0, max));
const list = <T extends z.ZodTypeAny>(item: T, max: number) =>
  z.array(item).transform((v) => v.slice(0, max));
const amount = z.coerce.number().min(0).catch(0);

export const budgetEstimateSchema = z.object({
  accommodationPerNight: amount,
  foodPerDay: amount,
  transportPerDay: amount,
});

export const localTipsSchema = z.object({
  language: text(80),
  phrases: list(z.object({ phrase: text(80), meaning: text(80) }), 8),
  etiquette: list(text(200), 6),
  tipping: text(200),
  plugType: text(80),
  emergencyNumber: text(40),
});
export type LocalTips = z.infer<typeof localTipsSchema>;

export const packingItemSchema = z.object({
  item: text(80),
  reason: text(160).optional().default(""),
});

export const itinerarySchema = z.object({
  title: z.string().max(120),
  summary: z.string().max(600),
  destination: z.object({
    name: z.string().max(80),
    country: z.string().max(80),
    lat,
    lng,
  }),
  currency: z.string().length(3),
  days: z.array(daySchema).max(MAX_TRIP_DAYS),
  budget: budgetEstimateSchema.optional(),
  packing: list(packingItemSchema, 30).optional().default([]),
  localTips: localTipsSchema.optional(),
});
export type Itinerary = z.infer<typeof itinerarySchema>;

/**
 * Generation streams as newline-delimited JSON. Each line is validated on its own,
 * so the UI can render activities the moment they arrive and a single malformed
 * line never poisons the whole trip.
 */
export const streamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("meta"),
    title: itinerarySchema.shape.title,
    summary: itinerarySchema.shape.summary,
    destination: itinerarySchema.shape.destination,
    currency: itinerarySchema.shape.currency,
  }),
  daySchema.omit({ activities: true }).extend({ type: z.literal("day") }),
  activitySchema.extend({ type: z.literal("activity"), day: daySchema.shape.day }),
  z.object({
    type: z.literal("extras"),
    budget: budgetEstimateSchema,
    packing: list(packingItemSchema, 30),
    localTips: localTipsSchema,
  }),
  z.object({ type: z.literal("reply"), text: z.string().max(1200) }),
  daySchema.extend({ type: z.literal("replace_day") }),
  z.object({ type: z.literal("done"), demo: z.boolean().optional() }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type StreamEvent = z.infer<typeof streamEventSchema>;

export function tripLength(startDate: string, endDate: string): number {
  const ms = Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}
