import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { computeBudget } from "@/lib/itinerary";
import type { Itinerary } from "@/lib/schema";
import { formatDate, formatDuration } from "@/lib/utils";

// Built-in PDF fonts lack symbols like ₱ and ₩, so amounts use ISO codes (e.g. "JPY 2,500").
function money(amount: number, currency: string): string {
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}

const ACCENT = "#ee5a36";
const INK = "#0e1b2c";
const MUTED = "#5d6878";

const s = StyleSheet.create({
  page: { padding: 44, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  brand: { fontSize: 9, color: ACCENT, letterSpacing: 2, marginBottom: 18 },
  title: { fontSize: 26, fontFamily: "Times-Bold", marginBottom: 6 },
  subtitle: { fontSize: 11, color: MUTED, marginBottom: 8 },
  summary: { fontSize: 10.5, lineHeight: 1.5, marginBottom: 18 },
  stats: { flexDirection: "row", gap: 10, marginBottom: 24 },
  stat: { flex: 1, backgroundColor: "#f6f1ea", borderRadius: 8, padding: 10 },
  statLabel: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1 },
  statValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 3 },
  dayHeader: { marginTop: 14, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e8e0d4", paddingBottom: 6 },
  dayLabel: { fontSize: 8, color: ACCENT, letterSpacing: 1.5, textTransform: "uppercase" },
  dayTitle: { fontSize: 15, fontFamily: "Times-Bold", marginTop: 2 },
  row: { flexDirection: "row", marginBottom: 9 },
  time: { width: 48, fontFamily: "Helvetica-Bold" },
  body: { flex: 1 },
  actTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  meta: { fontSize: 8.5, color: MUTED, marginTop: 1 },
  desc: { marginTop: 3, lineHeight: 1.4, color: "#2b3646" },
  tip: { marginTop: 3, fontSize: 8.5, color: "#92400e" },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 8, color: MUTED, flexDirection: "row", justifyContent: "space-between" },
});

export function TripPdf({ itinerary, travelers }: { itinerary: Itinerary; travelers: number }) {
  const budget = computeBudget(itinerary, travelers);
  const first = itinerary.days[0]?.date;
  const last = itinerary.days.at(-1)?.date;

  return (
    <Document title={itinerary.title} author="Wanderly">
      <Page size="A4" style={s.page} wrap>
        <Text style={s.brand}>WANDERLY · AI TRAVEL PLANNER</Text>
        <Text style={s.title}>{itinerary.title}</Text>
        <Text style={s.subtitle}>
          {itinerary.destination.name}, {itinerary.destination.country}
          {first && last ? `  ·  ${formatDate(first, { month: "long", day: "numeric" })} – ${formatDate(last, { month: "long", day: "numeric", year: "numeric" })}` : ""}
        </Text>
        <Text style={s.summary}>{itinerary.summary}</Text>

        <View style={s.stats}>
          <View style={s.stat}>
            <Text style={s.statLabel}>Days</Text>
            <Text style={s.statValue}>{itinerary.days.length}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>Travellers</Text>
            <Text style={s.statValue}>{travelers}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>Estimated total</Text>
            <Text style={s.statValue}>{money(budget.total, itinerary.currency)}</Text>
          </View>
        </View>

        {itinerary.days.map((day) => (
          <View key={day.day} wrap={false} minPresenceAhead={80}>
            <View style={s.dayHeader}>
              <Text style={s.dayLabel}>Day {day.day} · {formatDate(day.date)}</Text>
              <Text style={s.dayTitle}>{day.title}</Text>
            </View>
            {day.activities.map((a) => (
              <View key={a.id} style={s.row} wrap={false}>
                <Text style={s.time}>{a.time}</Text>
                <View style={s.body}>
                  <Text style={s.actTitle}>{a.title}</Text>
                  <Text style={s.meta}>
                    {formatDuration(a.durationMin)} · {a.cost > 0 ? money(a.cost, itinerary.currency) + " pp" : "Free"}
                  </Text>
                  <Text style={s.desc}>{a.description}</Text>
                  {a.tip ? <Text style={s.tip}>Tip: {a.tip}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text>Generated with Wanderly. AI suggestions; verify opening hours and prices.</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
