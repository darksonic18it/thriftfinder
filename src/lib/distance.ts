
/**
 * Calculates approximate straight-line distance between two coordinates.
 * Returns null if either location is unavailable or invalid.
 */
export function calculateDistanceKm(
  fromLat: number | null | undefined,
  fromLng: number | null | undefined,
  toLat: number | null | undefined,
  toLng: number | null | undefined,
): number | null {
  const values = [fromLat, fromLng, toLat, toLng];

  if (
    values.some(
      (value) =>
        typeof value !== 'number' || !Number.isFinite(value),
    ) ||
    fromLat! < -90 ||
    fromLat! > 90 ||
    toLat! < -90 ||
    toLat! > 90 ||
    fromLng! < -180 ||
    fromLng! > 180 ||
    toLng! < -180 ||
    toLng! > 180
  ) {
    return null;
  }

  const toRadians = (degrees: number) =>
    (degrees * Math.PI) / 180;

  const earthRadiusKm = 6371;

  const latitudeDifference = toRadians(toLat! - fromLat!);
  const longitudeDifference = toRadians(toLng! - fromLng!);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(fromLat!)) *
      Math.cos(toRadians(toLat!)) *
      Math.sin(longitudeDifference / 2) ** 2;

  const safeA = Math.min(1, Math.max(0, a));

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA))
  );
}

/** Formats a distance for display on a product card. */
export function formatDistanceKm(
  distanceKm: number | null | undefined,
): string | null {
  if (
    typeof distanceKm !== 'number' ||
    !Number.isFinite(distanceKm) ||
    distanceKm < 0
  ) {
    return null;
  }

  if (distanceKm < 0.05) {
    return 'Less than 50 m away';
  }

  if (distanceKm < 1) {
    return `Approximately ${Math.round(distanceKm * 1000)} m away`;
  }

  return `Approximately ${distanceKm.toFixed(1)} km away`;
}
