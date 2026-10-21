"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MapPin, Sparkles, Sun, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_META } from "@/lib/categories";
import type { Activity } from "@/lib/schema";

const PROMPTS = [
  "4 days in Kyoto, temples and street food",
  "A romantic long weekend in Paris",
  "Surf, rice terraces and yoga in Bali",
  "Lisbon on a budget with great nightlife",
];

const PREVIEW: Pick<Activity, "time" | "title" | "category" | "cost">[] = [
  { time: "07:00", title: "Fushimi Inari before the crowds", category: "culture", cost: 0 },
  { time: "10:30", title: "Kiyomizu-dera wooden stage", category: "sightseeing", cost: 500 },
  { time: "12:30", title: "Grazing Nishiki Market", category: "food", cost: 2500 },
  { time: "15:30", title: "Matcha ceremony in Gion", category: "culture", cost: 4000 },
  { time: "19:30", title: "Riverside dinner on Pontocho", category: "food", cost: 5000 },
];

function useTypewriter(phrases: string[]): string {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");

  useEffect(() => {
    const phrase = phrases[index % phrases.length] ?? "";
    if (text.length < phrase.length) {
      const t = setTimeout(() => setText(phrase.slice(0, text.length + 1)), 45);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setText("");
      setIndex((i) => i + 1);
    }, 2400);
    return () => clearTimeout(t);
  }, [text, index, phrases]);

  return text;
}

function StreamingPreview() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setVisible((v) => (v >= PREVIEW.length + 3 ? 0 : v + 1)), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative rounded-[28px] border border-white/40 bg-glass p-5 shadow-2xl shadow-primary/10 backdrop-blur-2xl dark:border-white/10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Day 1 · Kyoto</p>
          <p className="font-display text-xl">Vermilion Gates & Old Kyoto</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-accent/12 px-2.5 py-1 text-xs font-medium text-accent">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" />
          Writing
        </span>
      </div>
      <ol className="space-y-2.5">
        <AnimatePresence initial={false}>
          {PREVIEW.slice(0, Math.min(visible, PREVIEW.length)).map((a) => {
            const meta = CATEGORY_META[a.category];
            const Icon = meta.icon;
            return (
              <motion.li
                key={a.title}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/90 p-3"
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${meta.tone}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.time} · {a.cost ? `¥${a.cost.toLocaleString()}` : "Free"}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {visible < PREVIEW.length && (
          <li className="skeleton h-[62px] rounded-2xl" aria-hidden />
        )}
      </ol>
    </div>
  );
}

export function Hero() {
  const router = useRouter();
  const placeholder = useTypewriter(PROMPTS);
  const [value, setValue] = useState("");

  const start = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/plan?q=${encodeURIComponent(q)}` : "/plan");
  };

  return (
    <section className="grain relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-[-10%] size-[620px] rounded-full bg-accent/25 blur-[120px] dark:bg-accent/15" />
        <div className="absolute -bottom-48 left-[-10%] size-[560px] rounded-full bg-sky-400/25 blur-[120px] dark:bg-sky-500/10" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.35] dark:opacity-20" aria-hidden>
          <defs>
            <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.2" fill="currentColor" className="text-border" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
          >
            <Sparkles className="size-3.5 text-accent" /> Powered by Claude · Live streaming itineraries
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-balance font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Your next trip,
            <br />
            <span className="italic text-accent">planned</span> before your coffee cools.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            Tell Wanderly where you&apos;re dreaming of. Watch a day-by-day itinerary write itself
            onto a live map, with budgets, weather and local tips, then refine it by chatting.
          </motion.p>

          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onSubmit={start}
            className="mt-9 flex max-w-xl items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-5 shadow-xl shadow-primary/5 focus-within:ring-4 focus-within:ring-accent/15"
          >
            <MapPin className="size-5 shrink-0 text-accent" aria-hidden />
            <label htmlFor="hero-prompt" className="sr-only">
              Describe your trip
            </label>
            <input
              id="hero-prompt"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder || " "}
              className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground/70"
            />
            <Button type="submit" variant="accent" size="lg" className="shrink-0 px-5">
              Plan it <ArrowRight />
            </Button>
          </motion.form>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Sun className="size-4" /> Live weather</span>
            <span className="flex items-center gap-2"><Wallet className="size-4" /> Budget in any currency</span>
            <span className="flex items-center gap-2"><Sparkles className="size-4" /> No sign-up to try</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, rotate: 1.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 90 }}
          className="relative mx-auto w-full max-w-md lg:animate-float"
        >
          <StreamingPreview />
          <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-xl sm:block">
            <p className="text-xs text-muted-foreground">Estimated total</p>
            <p className="font-display text-2xl">¥84,200</p>
          </div>
          <div className="absolute -right-4 -top-5 hidden rounded-2xl border border-border bg-card px-4 py-2.5 shadow-xl sm:flex sm:items-center sm:gap-2">
            <Sun className="size-5 text-amber-500" />
            <span className="text-sm font-medium">19° · Clear</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
