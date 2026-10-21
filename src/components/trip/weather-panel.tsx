"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Droplets, Sun, type LucideIcon } from "lucide-react";
import { addDays } from "@/lib/itinerary";
import { formatDate } from "@/lib/utils";
import { useTripStore } from "@/store/trip-store";

interface DailyWeather {
  date: string;
  max: number;
  min: number;
  rain: number;
  code: number;
}

type Source = "forecast" | "last-year";

// WMO weather interpretation codes used by Open-Meteo.
function describe(code: number): { label: string; icon: LucideIcon } {
  if (code === 0) return { label: "Clear", icon: Sun };
  if (code <= 2) return { label: "Partly cloudy", icon: CloudSun };
  if (code === 3) return { label: "Overcast", icon: Cloud };
  if (code <= 48) return { label: "Fog", icon: CloudFog };
  if (code <= 57) return { label: "Drizzle", icon: CloudDrizzle };
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: "Rain", icon: CloudRain };
  if (code <= 77 || code === 85 || code === 86) return { label: "Snow", icon: CloudSnow };
  return { label: "Thunderstorms", icon: CloudLightning };
}

const FORECAST_HORIZON_DAYS = 15;
const DAILY = "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code";

async function fetchWeather(lat: number, lng: number, start: string, end: string): Promise<{ days: DailyWeather[]; source: Source }> {
  const today = new Date().toISOString().slice(0, 10);
  const isForecast = end <= addDays(today, FORECAST_HORIZON_DAYS) && start >= today;
  // Beyond the forecast window, the same dates last year are a useful guide.
  const shift = (d: string) => `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`;
  const url = isForecast
    ? `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=${DAILY}&timezone=auto&start_date=${start}&end_date=${end}`
    : `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&daily=${DAILY}&timezone=auto&start_date=${shift(start)}&end_date=${shift(end)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  const data = (await res.json()) as {
    daily?: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[]; weather_code: number[] };
  };
  const d = data.daily;
  if (!d) throw new Error("No weather data");
  return {
    source: isForecast ? "forecast" : "last-year",
    days: d.time.map((_, i) => ({
      date: addDays(start, i),
      max: d.temperature_2m_max[i] ?? 0,
      min: d.temperature_2m_min[i] ?? 0,
      rain: d.precipitation_sum[i] ?? 0,
      code: d.weather_code[i] ?? 0,
    })),
  };
}

export function WeatherPanel() {
  const trip = useTripStore((s) => s.trip);
  const lat = trip?.itinerary.destination.lat ?? 0;
  const lng = trip?.itinerary.destination.lng ?? 0;
  const start = trip?.request.startDate;
  const end = trip?.request.endDate;
  const [state, setState] = useState<{ data?: { days: DailyWeather[]; source: Source }; error?: string; isLoading: boolean }>({ isLoading: true });

  useEffect(() => {
    if (!start || !end || (lat === 0 && lng === 0)) return;
    let isActive = true;
    setState({ isLoading: true });
    fetchWeather(lat, lng, start, end)
      .then((data) => isActive && setState({ data, isLoading: false }))
      .catch((e: Error) => isActive && setState({ error: e.message, isLoading: false }));
    return () => {
      isActive = false;
    };
  }, [lat, lng, start, end]);

  if (state.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-40 rounded-3xl" />)}
      </div>
    );
  }
  if (state.error || !state.data) {
    return <p className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Weather is unavailable right now ({state.error}).</p>;
  }

  const { days, source } = state.data;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {source === "forecast"
          ? "Live forecast for your dates."
          : "Your trip is beyond the 16-day forecast, so this shows the actual weather on the same dates last year as a guide."}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {days.map((d) => {
          const { label, icon: Icon } = describe(d.code);
          return (
            <li key={d.date} className="rounded-3xl border border-border bg-card p-5">
              <p className="text-xs font-medium text-muted-foreground">{formatDate(d.date)}</p>
              <Icon className="my-3 size-9 text-accent" aria-hidden />
              <p className="font-display text-3xl tabular-nums">
                {Math.round(d.max)}°<span className="ml-1 text-lg text-muted-foreground">{Math.round(d.min)}°</span>
              </p>
              <p className="mt-1 text-sm">{label}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Droplets className="size-3" /> {d.rain.toFixed(1)} mm
              </p>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">Weather data by Open-Meteo.com</p>
    </div>
  );
}
