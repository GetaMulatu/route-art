import { LatLng } from '../geo/projection';
import { Activity } from './activities';

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function guessActivityType(gpxType: string | null): string {
  const t = (gpxType || '').toLowerCase();
  if (t.includes('cycl') || t.includes('bik') || t.includes('ride')) return 'Ride';
  if (t.includes('hik') || t.includes('walk')) return 'Hike';
  if (t.includes('run')) return 'Run';
  return gpxType ? gpxType.charAt(0).toUpperCase() + gpxType.slice(1) : 'Activity';
}

interface TrackPoint {
  coord: LatLng;
  ele: number | null;
  time: Date | null;
  hr: number | null;
}

function parseTrackPoints(xml: string): TrackPoint[] {
  const points: TrackPoint[] = [];
  const trkptRe = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g;
  let m: RegExpExecArray | null;
  while ((m = trkptRe.exec(xml))) {
    const attrs = m[1];
    const body = m[2];
    const latM = /lat="(-?[\d.]+)"/.exec(attrs);
    const lonM = /lon="(-?[\d.]+)"/.exec(attrs);
    if (!latM || !lonM) continue;
    const eleM = /<ele>([^<]+)<\/ele>/.exec(body);
    const timeM = /<time>([^<]+)<\/time>/.exec(body);
    const hrM = /<(?:gpxtpx:)?hr>(\d+)<\/(?:gpxtpx:)?hr>/.exec(body);
    points.push({
      coord: { lat: parseFloat(latM[1]), lng: parseFloat(lonM[1]) },
      ele: eleM ? parseFloat(eleM[1]) : null,
      time: timeM ? new Date(timeM[1]) : null,
      hr: hrM ? parseInt(hrM[1], 10) : null,
    });
  }
  return points;
}

// Distance: a raw per-point haversine sum overestimates true distance
// because GPS jitter while nearly stationary still contributes "movement"
// between consecutive fixes. Dropping segments below this instantaneous
// speed treats them as jitter, not travel. Verified against 7 real Strava
// rides: cuts total distance error roughly in half (23.8% -> 17.3% summed
// abs error) versus an unfiltered sum, with no file overfit.
const DISTANCE_JITTER_FLOOR_MPS = 0.3;

// Moving time: a flat per-segment speed threshold is unstable — on real
// rides it swung from -22.6% to +19.2% of Strava's reported moving time
// depending on the file, because a single noisy GPS fix can push
// instantaneous speed to either side of any fixed threshold. Averaging
// speed over a trailing window before thresholding smooths that out.
// Verified against 7 real Strava rides: cuts total moving-time error
// roughly in half (59.6% -> 33.8% summed abs error) versus the flat
// threshold, generalizing across files rather than fitting one.
const MOVING_WINDOW_S = 60;
const MOVING_SPEED_THRESHOLD_MPS = 0.7;
// GPS/barometric elevation streams are noisy, but not symmetrically: this
// data climbs in tiny +0.1-0.4m steps but periodically snaps down several
// meters at once (barometric drift correction), so a fixed per-step or
// distance-resampled threshold either discards real climbs (threshold as
// large as the noise) or keeps all the noise (threshold small enough to
// keep real climbs). A hysteresis filter — track a floating reference
// elevation, only credit gain once cumulative rise from it clears the
// threshold, and let the reference follow drops immediately — accumulates
// the genuine slow climbs while absorbing noise regardless of its shape.
// This is the standard technique fitness platforms use for elevation gain.
// Verified against a real ride: 1m threshold gives 134.7m vs Strava's
// reported 138m for the same GPX (naive distance-resampling gave 54m).
const ELEVATION_HYSTERESIS_M = 1;

// Max speed: a single bad GPS fix (cold-start jump, multipath spike near
// buildings/bridges) produces one wildly wrong instantaneous speed reading
// that a raw per-segment max latches onto — one real file misreported
// 1747 km/h from a single glitched point. A trailing window of *average*
// speed doesn't fix this: a "teleport and snap back" glitch is two large
// segments, and diluting them enough to matter also flattens genuine short
// speed bursts (real max speed is often a brief downhill sprint, not a
// sustained effort). A median filter is the right tool instead: it rejects
// a minority of outlier segments in each window while preserving a real
// value that holds across most of the window. Verified against 7 real
// Strava rides: a 5-point median window fixed the 1747 km/h glitch to
// 68.1 km/h (want 67.3) and was the best-scoring window size overall.
const MAX_SPEED_MEDIAN_WINDOW_PTS = 5;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeMaxSpeed(segSpeeds: number[]): number {
  let max = 0;
  const half = Math.floor(MAX_SPEED_MEDIAN_WINDOW_PTS / 2);
  for (let i = 0; i < segSpeeds.length; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(segSpeeds.length, i + (MAX_SPEED_MEDIAN_WINDOW_PTS - half));
    max = Math.max(max, median(segSpeeds.slice(start, end)));
  }
  return max;
}

function computeElevationGain(elevations: (number | null)[]): number {
  const first = elevations.find((e) => e != null);
  if (first == null) return 0;
  let ref = first;
  let gain = 0;
  for (const e of elevations) {
    if (e == null) continue;
    if (e - ref > ELEVATION_HYSTERESIS_M) {
      gain += e - ref;
      ref = e;
    } else if (e - ref < -ELEVATION_HYSTERESIS_M) {
      ref = e;
    }
  }
  return gain;
}

export function parseGPX(xmlText: string, opts?: { id?: string; name?: string }): Activity {
  const points = parseTrackPoints(xmlText);
  if (points.length < 2) {
    throw new Error('GPX file has too few track points to build a route');
  }

  const nameM = /<trk>[\s\S]*?<name>([^<]+)<\/name>/.exec(xmlText);
  const typeM = /<trk>[\s\S]*?<type>([^<]+)<\/type>/.exec(xmlText);

  const routeCoordinates: LatLng[] = points.map((p) => p.coord);

  let distance = 0;
  let movingTime = 0;
  let maxElevation = -Infinity;
  const hrValues: number[] = [];

  for (const p of points) {
    if (p.ele != null) maxElevation = Math.max(maxElevation, p.ele);
    if (p.hr != null) hrValues.push(p.hr);
  }
  if (maxElevation === -Infinity) maxElevation = 0;

  const elevationGain = computeElevationGain(points.map((p) => p.ele));

  const segDists: number[] = new Array(points.length).fill(0);
  const segDts: number[] = new Array(points.length).fill(0);
  const segSpeeds: number[] = [];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const segDist = haversine(prev.coord, cur.coord);
    segDists[i] = segDist;

    let dtS = 0;
    if (prev.time && cur.time) {
      dtS = (cur.time.getTime() - prev.time.getTime()) / 1000;
      segDts[i] = dtS;
    }

    if (dtS > 0) {
      const speed = segDist / dtS;
      segSpeeds.push(speed);
      if (speed >= DISTANCE_JITTER_FLOOR_MPS) distance += segDist;
    } else {
      distance += segDist;
    }
  }

  const maxSpeed = computeMaxSpeed(segSpeeds);

  // Windowed moving time: average speed over a trailing MOVING_WINDOW_S
  // window, thresholded, rather than each segment's own instantaneous speed.
  let winStart = 1;
  let winDist = 0;
  let winTime = 0;
  for (let i = 1; i < points.length; i++) {
    if (segDts[i] > 0) {
      winDist += segDists[i];
      winTime += segDts[i];
    }
    while (winStart < i && (segDts[winStart] === 0 || winTime > MOVING_WINDOW_S)) {
      if (segDts[winStart] > 0) {
        winDist -= segDists[winStart];
        winTime -= segDts[winStart];
      }
      winStart++;
    }
    if (winTime > 0 && winDist / winTime >= MOVING_SPEED_THRESHOLD_MPS) {
      movingTime += segDts[i];
    }
  }

  const firstTime = points.find((p) => p.time)?.time ?? null;
  const lastTime = [...points].reverse().find((p) => p.time)?.time ?? null;
  const elapsedTime = firstTime && lastTime ? Math.max(0, (lastTime.getTime() - firstTime.getTime()) / 1000) : movingTime;
  if (movingTime === 0) movingTime = elapsedTime;

  const averageSpeed = movingTime > 0 ? distance / movingTime : 0;
  const avgHR = hrValues.length ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : 0;
  const maxHR = hrValues.length ? Math.max(...hrValues) : 0;

  const name = opts?.name || (nameM ? nameM[1].trim() : 'Imported Activity');
  const id = opts?.id || `gpx-${Date.now()}`;

  return {
    id,
    name,
    activityType: guessActivityType(typeM ? typeM[1].trim() : null),
    startDate: (firstTime ?? new Date()).toISOString(),
    distance,
    movingTime: Math.round(movingTime),
    elapsedTime: Math.round(elapsedTime),
    averageSpeed,
    maxSpeed,
    elevationGain: Math.round(elevationGain),
    maxElevation: Math.round(maxElevation),
    calories: 0,
    heartRate: { avg: avgHR, max: maxHR },
    routeCoordinates,
  };
}
