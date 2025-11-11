/**
 * Calculate air (straight line) distance between two coordinates using Haversine formula.
 * @param start - { latitude, longitude }
 * @param end - { latitude, longitude }
 * @returns distance in kilometers
 */
export function getAirDistance(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(end.latitude - start.latitude);
  const dLon = deg2rad(end.longitude - start.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(start.latitude)) *
      Math.cos(deg2rad(end.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
