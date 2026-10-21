import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SampleTripCards } from "@/components/landing/sample-trip-cards";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Explore sample trips" };

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-10 max-w-2xl">
        <h1 className="font-display text-5xl tracking-tight">Explore</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Hand-crafted sample itineraries. Open one to get your own editable copy, then customise it
          with drag-and-drop or the AI assistant.
        </p>
      </div>
      <SampleTripCards />
      <div className="mt-14 rounded-3xl border border-border bg-card p-8 text-center">
        <p className="font-display text-3xl">Somewhere else in mind?</p>
        <Link href="/plan" className={`${buttonVariants({ variant: "accent" })} mt-5`}>
          <Sparkles /> Plan a custom trip
        </Link>
      </div>
    </div>
  );
}
