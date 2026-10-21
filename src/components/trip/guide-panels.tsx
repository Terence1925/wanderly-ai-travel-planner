"use client";

import { useEffect, useState } from "react";
import { Check, HandCoins, Languages, Phone, Plug, Users } from "lucide-react";
import { cn, storage } from "@/lib/utils";
import { useTripStore } from "@/store/trip-store";

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</p>;
}

export function PackingPanel() {
  const trip = useTripStore((s) => s.trip);
  const packing = trip?.itinerary.packing ?? [];
  const key = `wanderly:packed:${trip?.id ?? "none"}`;
  // Checked state is a per-device convenience, so it lives in the browser only.
  const [packed, setPacked] = useState<string[]>([]);
  useEffect(() => setPacked(storage.get<string[]>(key, [])), [key]);

  if (!packing.length) return <EmptyState text="Packing suggestions appear when the itinerary finishes." />;

  const toggle = (item: string) => {
    const next = packed.includes(item) ? packed.filter((p) => p !== item) : [...packed, item];
    setPacked(next);
    storage.set(key, next);
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Packing list</h3>
        <span className="text-sm text-muted-foreground tabular-nums">
          {packed.filter((p) => packing.some((i) => i.item === p)).length}/{packing.length} packed
        </span>
      </div>
      <ul className="divide-y divide-border">
        {packing.map((p) => {
          const isPacked = packed.includes(p.item);
          return (
            <li key={p.item}>
              <label className="flex cursor-pointer items-start gap-3 py-3">
                <input type="checkbox" checked={isPacked} onChange={() => toggle(p.item)} className="peer sr-only" />
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                    isPacked ? "border-success bg-success text-white" : "border-border",
                  )}
                >
                  {isPacked && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span>
                  <span className={cn("block text-sm font-medium", isPacked && "text-muted-foreground line-through")}>{p.item}</span>
                  {p.reason && <span className="block text-xs text-muted-foreground">{p.reason}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TipsPanel() {
  const tips = useTripStore((s) => s.trip?.itinerary.localTips);
  if (!tips) return <EmptyState text="Local tips appear when the itinerary finishes." />;

  const facts = [
    { icon: HandCoins, label: "Tipping", value: tips.tipping },
    { icon: Plug, label: "Power", value: tips.plugType },
    { icon: Phone, label: "Emergency", value: tips.emergencyNumber },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-3xl border border-border bg-card p-5">
            <Icon className="mb-3 size-5 text-accent" aria-hidden />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>
      <section className="rounded-3xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          <Languages className="size-5 text-accent" /> Useful phrases · {tips.language}
        </h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          {tips.phrases.map((p) => (
            <div key={p.phrase} className="rounded-2xl bg-muted/60 p-4">
              <dt className="font-display text-lg">{p.phrase}</dt>
              <dd className="text-sm text-muted-foreground">{p.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="rounded-3xl border border-border bg-card p-6">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Users className="size-5 text-accent" /> Etiquette
        </h3>
        <ul className="space-y-2 text-sm">
          {tips.etiquette.map((e) => (
            <li key={e} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" /> {e}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
