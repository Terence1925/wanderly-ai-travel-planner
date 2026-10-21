import {
  BedDouble,
  Bus,
  Camera,
  Landmark,
  Martini,
  Mountain,
  ShoppingBag,
  Sparkles,
  Trees,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { Activity } from "@/lib/schema";

interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  tone: string;
}

export const CATEGORY_META: Record<Activity["category"], CategoryMeta> = {
  sightseeing: { label: "Sightseeing", icon: Camera, tone: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  food: { label: "Food", icon: UtensilsCrossed, tone: "bg-orange-500/12 text-orange-700 dark:text-orange-300" },
  culture: { label: "Culture", icon: Landmark, tone: "bg-violet-500/12 text-violet-700 dark:text-violet-300" },
  nature: { label: "Nature", icon: Trees, tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" },
  nightlife: { label: "Nightlife", icon: Martini, tone: "bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300" },
  adventure: { label: "Adventure", icon: Mountain, tone: "bg-amber-500/12 text-amber-700 dark:text-amber-300" },
  shopping: { label: "Shopping", icon: ShoppingBag, tone: "bg-pink-500/12 text-pink-700 dark:text-pink-300" },
  relaxation: { label: "Relaxation", icon: Sparkles, tone: "bg-teal-500/12 text-teal-700 dark:text-teal-300" },
  transport: { label: "Transport", icon: Bus, tone: "bg-slate-500/12 text-slate-700 dark:text-slate-300" },
  accommodation: { label: "Stay", icon: BedDouble, tone: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300" },
};

/** Distinct hues for each day's pins and route line. */
export const DAY_COLORS = [
  "#ee5a36",
  "#0e9aa7",
  "#7c5cff",
  "#e8a317",
  "#2f80ed",
  "#d6457a",
  "#2fa36b",
  "#64748b",
  "#b45309",
  "#0891b2",
] as const;

export function dayColor(day: number): string {
  return DAY_COLORS[(day - 1) % DAY_COLORS.length] ?? DAY_COLORS[0];
}
