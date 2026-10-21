"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { DestinationCover } from "@/components/destination-cover";
import { SAMPLE_TRIPS } from "@/lib/demo/samples";
import { createTripFromSample } from "@/lib/trips/from-sample";

export function SampleTripCards() {
  const router = useRouter();

  const open = (slug: string) => {
    const trip = createTripFromSample(slug);
    if (trip) router.push(`/trip/${trip.id}`);
  };

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {SAMPLE_TRIPS.map((s, i) => {
        const it = s.itinerary;
        const stops = it.days.reduce((n, d) => n + d.activities.length, 0);
        return (
          <motion.button
            key={s.slug}
            type="button"
            onClick={() => open(s.slug)}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="group text-left"
            aria-label={`Open the sample ${it.destination.name} trip`}
          >
            <DestinationCover
              place={s.coverQuery}
              className="aspect-[4/5] rounded-[28px] shadow-lg transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-2xl"
            >
              <div className="flex h-full flex-col justify-between p-6 text-white">
                <span className="ml-auto grid size-10 place-items-center rounded-full bg-white/20 backdrop-blur transition-transform group-hover:rotate-45">
                  <ArrowUpRight className="size-5" />
                </span>
                <div>
                  <p className="flex items-center gap-1.5 text-sm opacity-90">
                    <MapPin className="size-4" /> {it.destination.name}, {it.destination.country}
                  </p>
                  <p className="mt-1 font-display text-3xl leading-tight">{it.title}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-sm opacity-80">
                    <CalendarDays className="size-4" /> {it.days.length} days · {stops} stops
                  </p>
                </div>
              </div>
            </DestinationCover>
          </motion.button>
        );
      })}
    </div>
  );
}
