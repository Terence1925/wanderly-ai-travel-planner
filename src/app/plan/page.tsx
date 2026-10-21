import { Suspense } from "react";
import type { Metadata } from "next";
import { TripWizard } from "@/components/plan/trip-wizard";
import { isAiConfigured } from "@/lib/ai";

export const metadata: Metadata = { title: "Plan a trip" };

export default function PlanPage() {
  return (
    <Suspense>
      <TripWizard isDemo={!isAiConfigured()} />
    </Suspense>
  );
}
