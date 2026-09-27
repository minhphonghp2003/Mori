import { useEffect, useState } from "react";

interface ReverseGeocodeResult {
  /** Human-readable place ("Hoàn Kiếm, Hà Nội") or null while resolving. */
  label: string | null;
  isLoading: boolean;
}

const cache = new Map<string, string>();

const keyFor = (lat: number, lng: number) =>
  `${lat.toFixed(3)},${lng.toFixed(3)}`;

/**
 * Free client-side reverse geocoding (BigDataCloud, no key, CORS-enabled).
 * Results are cached per ~100 m cell. Never throws — callers fall back to
 * raw coordinates when the lookup fails or is offline.
 */
export const useReverseGeocode = (
  latitude: number | null,
  longitude: number | null,
): ReverseGeocodeResult => {
  const [label, setLabel] = useState<string | null>(() =>
    latitude == null || longitude == null
      ? null
      : (cache.get(keyFor(latitude, longitude)) ?? null),
  );
  const [isLoading, setIsLoading] = useState(false);

  // Rounded to ~100 m so small GPS jitter doesn't refetch the name.
  const latKey = latitude == null ? null : latitude.toFixed(3);
  const lngKey = longitude == null ? null : longitude.toFixed(3);

  useEffect(() => {
    if (latKey == null || lngKey == null) {
      setLabel(null);
      return;
    }
    const cached = cache.get(`${latKey},${lngKey}`);
    if (cached) {
      setLabel(cached);
      return;
    }
    let alive = true;
    setIsLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latKey}&longitude=${lngKey}&localityLanguage=vi`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          city?: string;
          locality?: string;
          principalSubdivision?: string;
        };
        const place = data.city || data.locality || "";
        const region = data.principalSubdivision || "";
        const text = [place, region].filter(Boolean).join(", ");
        if (alive && text) {
          cache.set(`${latKey},${lngKey}`, text);
          setLabel(text);
        }
      } catch {
        // Offline / blocked — caller shows coordinates instead.
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [latKey, lngKey]);

  return { label, isLoading };
};
