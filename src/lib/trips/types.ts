import type { Itinerary, TripRequest } from "@/lib/schema";

export interface TripRecord {
  /** `local_…` for guest trips kept in this browser, a UUID for cloud trips. */
  id: string;
  isCloud: boolean;
  ownerId?: string;
  request: TripRequest;
  itinerary: Itinerary;
  isPublic?: boolean;
  shareSlug?: string;
  inviteCode?: string;
  createdAt: string;
  updatedAt: string;
}

export const isLocalId = (id: string) => id.startsWith("local_");
