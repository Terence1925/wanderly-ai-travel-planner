import type { Metadata } from "next";
import { CONTACT_URL, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="October 21, 2026">
      <p>
        Wanderly is a portfolio project that plans trips with AI. This page explains what data it
        handles and why. It collects only what it needs to work.
      </p>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details</strong> when you sign in: your email address and, if you use
            Google sign-in, your name and profile photo.
          </li>
          <li>
            <strong>Trips you save</strong>: destination, dates, preferences, the itinerary and any
            assistant chat messages on that trip.
          </li>
          <li>
            <strong>A hashed form of your IP address</strong>, used only to limit how many AI
            requests one visitor can make per hour. The raw address is never stored.
          </li>
        </ul>
        <p className="mt-3">
          If you don&apos;t sign in, trips are kept only in your own browser&apos;s local storage and
          never reach our database.
        </p>
      </section>

      <section>
        <h2>How it&apos;s used</h2>
        <ul>
          <li>To sign you in and keep your trips available across devices.</li>
          <li>To share a trip when you choose to make it public or invite collaborators.</li>
          <li>To generate and edit itineraries with AI.</li>
        </ul>
        <p className="mt-3">We don&apos;t sell data, show ads, or use tracking cookies.</p>
      </section>

      <section>
        <h2>Services that process data</h2>
        <ul>
          <li><strong>Supabase</strong>: sign-in and database storage.</li>
          <li><strong>Vercel</strong>: hosting.</li>
          <li>
            <strong>Google Gemini</strong> (or Anthropic Claude): receives your trip details and
            notes to write the itinerary. Don&apos;t include sensitive personal information in notes.
          </li>
          <li>
            <strong>Open-Meteo, Frankfurter, Wikipedia and OpenFreeMap</strong>: receive the
            destination, coordinates or currency needed to show weather, exchange rates, photos and
            maps. They don&apos;t receive your account details.
          </li>
        </ul>
      </section>

      <section>
        <h2>Your choices</h2>
        <ul>
          <li>You can delete any trip from My trips at any time.</li>
          <li>Public trips stay private unless you switch on sharing.</li>
          <li>
            To delete your account and all its data, open a request on{" "}
            <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer">GitHub</a>.
          </li>
        </ul>
      </section>
    </LegalPage>
  );
}
