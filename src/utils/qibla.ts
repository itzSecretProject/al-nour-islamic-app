// Qibla as the RHUMB (constant-compass) bearing to the Kaaba.
//
// Chosen by the user over the great-circle initial bearing: a rhumb course is a
// perfectly straight line to the Kaaba on a Mercator map, so the map line, the
// compass arrow and the "ALIGNED!" indicator all agree exactly — you are aligned
// precisely when you look along the on-screen line, and holding that compass
// heading the whole way takes you to the Kaaba.
export function getQiblaDirection(lat1: number, lon1: number): number {
  const meccaLat = 21.422487;
  const meccaLon = 39.826206;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(meccaLat);

  // Shortest longitude difference, wrapped to (-180°, 180°]
  const dLonDeg = ((meccaLon - lon1 + 540) % 360) - 180;
  const Δλ = toRad(dLonDeg);

  // Mercator latitude stretch
  const Δψ = Math.log(
    Math.tan(Math.PI / 4 + φ2 / 2) / Math.tan(Math.PI / 4 + φ1 / 2),
  );

  const θ = Math.atan2(Δλ, Δψ) * (180 / Math.PI);
  return (θ + 360) % 360;
}
