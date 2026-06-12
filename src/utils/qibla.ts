export function getQiblaDirection(lat1: number, lon1: number): number {
  const meccaLat = 21.422487;
  const meccaLon = 39.826206;

  // Convert to radians
  const lat1Rad = lat1 * (Math.PI / 180);
  const lon1Rad = lon1 * (Math.PI / 180);
  const lat2Rad = meccaLat * (Math.PI / 180);
  const lon2Rad = meccaLon * (Math.PI / 180);

  const dLon = lon2Rad - lon1Rad;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let qiblaHeading = Math.atan2(y, x) * (180 / Math.PI);
  qiblaHeading = (qiblaHeading + 360) % 360;

  return qiblaHeading;
}
