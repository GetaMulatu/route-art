export interface LatLng {
  lat: number;
  lng: number;
}

export interface Point {
  x: number;
  y: number;
}

export function projectCoords(
  coords: LatLng[],
  canvasW: number,
  canvasH: number,
  scale = 0.78,
  offsetX = 0,
  offsetY = 0
): Point[] {
  if (!coords || coords.length < 2) return [];

  const lats = coords.map(c => c.lat);
  const lngs = coords.map(c => c.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const spanLat = maxLat - minLat || 1e-6;
  const spanLng = (maxLng - minLng) * cosLat || 1e-6;
  const s = Math.min((canvasW * scale) / spanLng, (canvasH * scale) / spanLat);
  const cx = canvasW / 2 + offsetX;
  const cy = canvasH / 2 + offsetY;
  const midLng = (minLng + maxLng) / 2;

  return coords.map(c => ({
    x: cx + (c.lng - midLng) * cosLat * s,
    y: cy - (c.lat - midLat) * s,
  }));
}

export function buildSkiaPath(points: Point[]): string {
  if (points.length < 2) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
}

// Sample loop route for testing
export function genSampleLoop(): LatLng[] {
  const pts: LatLng[] = [];
  for (let i = 0; i <= 179; i++) {  // ← 179 instead of 180
    const t = i / 180;
    const a = t * Math.PI * 2;
    const r1 = 0.009 + 0.003 * Math.sin(a * 3) + 0.002 * Math.cos(a * 7);
    pts.push({
      lat: 51.505 + r1 * Math.cos(a),
      lng: -0.09 + r1 * 0.7 * Math.sin(a) * 1.4,
    });
  }
  return pts;
}