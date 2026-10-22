"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPlacePhoto, type PlacePhoto } from "@/lib/place-photo";

interface PhotoState {
  photo: PlacePhoto | null;
  isLoading: boolean;
}

/**
 * Looks up a photo for an activity once its element nears the viewport, so a long
 * itinerary doesn't fire dozens of requests up front. Attach the returned ref.
 */
export function usePlacePhoto<T extends Element>(title: string, destination: string) {
  const ref = useRef<T>(null);
  const [isNear, setIsNear] = useState(false);
  const [state, setState] = useState<PhotoState>({ photo: null, isLoading: true });

  useEffect(() => {
    const el = ref.current;
    if (!el || isNear) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isNear]);

  useEffect(() => {
    if (!isNear || !title || !destination) return;
    let isActive = true;
    setState((s) => ({ ...s, isLoading: true }));
    fetchPlacePhoto(title, destination).then((photo) => {
      if (isActive) setState({ photo, isLoading: false });
    });
    return () => {
      isActive = false;
    };
  }, [isNear, title, destination]);

  return { ref, ...state };
}

/** Eager variant for one-off places such as the map popup. */
export function usePlacePhotoNow(title: string | undefined, destination: string): PlacePhoto | null {
  const [photo, setPhoto] = useState<PlacePhoto | null>(null);
  useEffect(() => {
    setPhoto(null);
    if (!title || !destination) return;
    let isActive = true;
    fetchPlacePhoto(title, destination).then((p) => isActive && setPhoto(p));
    return () => {
      isActive = false;
    };
  }, [title, destination]);
  return photo;
}
