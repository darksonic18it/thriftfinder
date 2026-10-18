
export interface BuyerLocation {
  latitude: number;
  longitude: number;
  label: string;
  source: 'gps' | 'barangay';
}

const STORAGE_KEY = 'thriftfinder-buyer-location';

export function getBuyerLocation(): BuyerLocation | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as BuyerLocation;

    if (
      !Number.isFinite(value.latitude) ||
      value.latitude < -90 ||
      value.latitude > 90 ||
      !Number.isFinite(value.longitude) ||
      value.longitude < -180 ||
      value.longitude > 180 ||
      !['gps', 'barangay'].includes(value.source)
    ) {
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

export function saveBuyerLocation(location: BuyerLocation): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Location persistence may be unavailable in private browsing.
  }
}

export function getCurrentGpsLocation(): Promise<BuyerLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: BuyerLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: 'Your current location',
          source: 'gps',
        };

        saveBuyerLocation(location);
        resolve(location);
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  });
}

export function calculateDistanceKm(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = radians(destination.latitude - origin.latitude);
  const dLon = radians(destination.longitude - origin.longitude);
  const lat1 = radians(origin.latitude);
  const lat2 = radians(destination.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2;

  const safeA = Math.min(1, Math.max(0, a));

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA))
  );
}
