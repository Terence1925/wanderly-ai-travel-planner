import { ImageResponse } from "next/og";
import { getPublicTrip } from "@/lib/trips/public";

export const alt = "A trip planned with Wanderly";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Rich link preview when a shared trip is pasted into chat apps or social media. */
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const trip = await getPublicTrip((await params).slug);
  const title = trip?.itinerary.title ?? "A trip planned with Wanderly";
  const place = trip ? `${trip.itinerary.destination.name}, ${trip.itinerary.destination.country}` : "";
  const days = trip?.itinerary.days.length ?? 0;
  const stops = trip?.itinerary.days.reduce((n, d) => n + d.activities.length, 0) ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0b3d59 0%, #3f4f86 55%, #ee5a36 100%)",
          color: "white",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 4, opacity: 0.85 }}>WANDERLY</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 34, opacity: 0.9 }}>{place}</div>
          <div style={{ fontSize: 76, lineHeight: 1.05, marginTop: 12, maxWidth: 1000 }}>{title}</div>
          {trip && (
            <div style={{ fontSize: 30, marginTop: 28, opacity: 0.85 }}>
              {days} days · {stops} stops
            </div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
