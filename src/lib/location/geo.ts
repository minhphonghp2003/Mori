/** Great-circle distance between two WGS84 points, in meters (haversine). */
export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Meters → km, ceiled to one decimal ("Cách 0.6 km"). 0 stays 0 (hidden by callers). */
export const metersToKm = (meters: number): number => Math.ceil(meters / 100) / 10;

/** Display string: meters under 1 km ("523 m"), ceiled km above ("1.2 km"). */
export const formatDistance = (meters: number): string =>
  meters < 1000 ? `${Math.ceil(meters)} m` : `${metersToKm(meters)} km`;
