"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { computeBudget } from "@/lib/itinerary";
import { cn, formatMoney } from "@/lib/utils";
import { useTripStore } from "@/store/trip-store";

// Colours are validated categorical slots defined as --series-* tokens in globals.css.
const SERIES = [
  { key: "accommodation", label: "Stay" },
  { key: "food", label: "Food" },
  { key: "activities", label: "Activities" },
  { key: "transport", label: "Transport" },
] as const;

const TARGET_CURRENCIES = ["USD", "EUR", "GBP", "PHP", "JPY", "AUD", "SGD", "CAD"] as const;

/** Live rates from the free Frankfurter (ECB) API; null when the pair isn't supported. */
function useExchangeRate(from: string, to: string): { rate: number | null; isLoading: boolean } {
  const [state, setState] = useState<{ rate: number | null; isLoading: boolean }>({ rate: 1, isLoading: false });

  useEffect(() => {
    if (from === to) return setState({ rate: 1, isLoading: false });
    let isActive = true;
    setState({ rate: null, isLoading: true });
    fetch(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { rates?: Record<string, number> }) => isActive && setState({ rate: d.rates?.[to] ?? null, isLoading: false }))
      .catch(() => isActive && setState({ rate: null, isLoading: false }));
    return () => {
      isActive = false;
    };
  }, [from, to]);

  return state;
}

export function BudgetPanel() {
  const trip = useTripStore((s) => s.trip);
  const [target, setTarget] = useState<string>("");
  const itinerary = trip?.itinerary;
  const travelers = trip?.request.travelers ?? 1;
  const budget = useMemo(() => (itinerary ? computeBudget(itinerary, travelers) : null), [itinerary, travelers]);
  const base = itinerary?.currency ?? "USD";
  const display = target || base;
  const { rate, isLoading } = useExchangeRate(base, display);
  const [hovered, setHovered] = useState<number | null>(null);

  if (!itinerary || !budget) return null;
  const convert = (n: number) => n * (rate ?? 1);
  const showConverted = display !== base && rate !== null;
  const money = (n: number) => formatMoney(showConverted ? convert(n) : n, showConverted ? display : base);
  const maxDay = Math.max(1, ...budget.perDay.map((d) => d.activities));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-border bg-card p-6">
        <div>
          <p className="text-sm text-muted-foreground">Estimated total · {travelers} traveller{travelers > 1 ? "s" : ""}</p>
          <p className="font-display text-5xl tracking-tight tabular-nums">{money(budget.total)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{money(budget.perPerson)} per person</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <ArrowRightLeft className="size-4 text-muted-foreground" aria-hidden />
          <span className="sr-only">Display currency</span>
          <select
            value={display}
            onChange={(e) => setTarget(e.target.value)}
            className="h-9 rounded-full border border-border bg-card px-3"
          >
            {[base, ...TARGET_CURRENCIES.filter((c) => c !== base)].map((c) => (
              <option key={c} value={c}>
                {c}
                {c === base ? " (local)" : ""}
              </option>
            ))}
          </select>
        </label>
        {display !== base && (
          <p className="w-full text-xs text-muted-foreground" aria-live="polite">
            {isLoading
              ? "Fetching live rate…"
              : rate !== null
                ? `Live ECB rate: 1 ${base} = ${rate.toFixed(4)} ${display}`
                : `Live rates aren't available for ${base}, so amounts are shown in ${base}.`}
          </p>
        )}
      </div>

      <section aria-labelledby="split-title" className="rounded-3xl border border-border bg-card p-6">
        <h3 id="split-title" className="mb-4 font-semibold">Where the money goes</h3>
        {budget.total > 0 ? (
          <>
            <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Share of total by category">
              {SERIES.map((s) => {
                const value = budget[s.key];
                if (value <= 0) return null;
                return (
                  <div
                    key={s.key}
                    title={`${s.label}: ${money(value)}`}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${(value / budget.total) * 100}%`, backgroundColor: `var(--series-${s.key})` }}
                  />
                );
              })}
            </div>
            {/* Legend doubles as the table view; values are always visible, never colour-only. */}
            <table className="mt-5 w-full text-sm">
              <caption className="sr-only">Budget by category</caption>
              <tbody>
                {SERIES.map((s) => {
                  const value = budget[s.key];
                  return (
                    <tr key={s.key} className="border-t border-border first:border-0">
                      <th scope="row" className="py-2.5 text-left font-normal">
                        <span className="flex items-center gap-2.5">
                          <span className="size-3 rounded-sm" style={{ backgroundColor: `var(--series-${s.key})` }} />
                          {s.label}
                        </span>
                      </th>
                      <td className="py-2.5 text-right text-muted-foreground tabular-nums">
                        {Math.round((value / budget.total) * 100)}%
                      </td>
                      <td className="w-32 py-2.5 text-right font-medium tabular-nums">{money(value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Costs will appear once the itinerary is ready.</p>
        )}
      </section>

      {budget.perDay.length > 0 && (
        <section aria-labelledby="daily-title" className="rounded-3xl border border-border bg-card p-6">
          <h3 id="daily-title" className="font-semibold">Activity spend per day</h3>
          <p className="mb-5 text-xs text-muted-foreground">Tickets, meals and experiences for the whole group</p>
          <div className="flex h-44 items-end gap-2 border-b border-border" role="list">
            {budget.perDay.map((d) => (
              <div
                key={d.day}
                role="listitem"
                aria-label={`Day ${d.day}: ${money(d.activities)}`}
                tabIndex={0}
                onMouseEnter={() => setHovered(d.day)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(d.day)}
                onBlur={() => setHovered(null)}
                className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
              >
                {hovered === d.day && (
                  <div className="absolute -top-2 z-10 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-lg">
                    <span className="text-muted-foreground">Day {d.day}</span>{" "}
                    <span className="font-semibold tabular-nums">{money(d.activities)}</span>
                  </div>
                )}
                <div
                  className={cn("w-full max-w-12 rounded-t-[4px] transition-opacity", hovered !== null && hovered !== d.day && "opacity-50")}
                  style={{ height: `${Math.max(2, (d.activities / maxDay) * 100)}%`, backgroundColor: "var(--series-accommodation)" }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            {budget.perDay.map((d) => (
              <span key={d.day} className="flex-1 text-center text-xs text-muted-foreground">
                D{d.day}
              </span>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Estimates assume two travellers per room. Prices are AI estimates in {base}; check before booking.
      </p>
    </div>
  );
}
