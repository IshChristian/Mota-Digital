type Point = { latitude: number; longitude: number };

export function haversineKm(a: Point, b: Point) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Decodes a Google encoded polyline into coordinates. */
export function decodePolyline(encoded: string) {
  const points: Point[] = [];
  let index = 0, latitude = 0, longitude = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0, shift = 0, byte: number;
      do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) latitude += delta; else longitude += delta;
    }
    points.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
  }
  return points;
}
