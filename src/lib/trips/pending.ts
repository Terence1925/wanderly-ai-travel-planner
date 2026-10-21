"use client";

import type { TripRequest } from "@/lib/schema";

const KEY = "wanderly:pending-request";

let memory: TripRequest | null = null;

/** Hands the wizard's request to the workspace page; survives a refresh mid-generation. */
export function setPendingRequest(request: TripRequest): void {
  memory = request;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(request));
  } catch {
    // Session storage unavailable; the in-memory copy is used instead.
  }
}

/** Reads without consuming, so React's dev double-mount doesn't lose the request. */
export function getPendingRequest(): TripRequest | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as TripRequest;
  } catch {
    // fall back to memory
  }
  return memory;
}

export function clearPendingRequest(): void {
  memory = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
