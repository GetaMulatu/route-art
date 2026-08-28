import { LatLng } from '../geo/projection';

export interface HeartRate {
  avg: number;
  max: number;
}

export interface Activity {
  id: string;
  name: string;
  activityType: string;
  startDate: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  averageSpeed: number;
  maxSpeed: number;
  elevationGain: number;
  maxElevation: number;
  calories: number;
  heartRate: HeartRate;
  routeCoordinates: LatLng[];
}

function makePt(lat: number, lng: number): LatLng {
  return { lat, lng };
}

function genLoop(): LatLng[] {
  const pts: LatLng[] = [];
  for (let i = 0; i <= 180; i++) {
    const t = i / 180;
    const a = t * Math.PI * 2;
    const r1 = 0.009 + 0.003 * Math.sin(a * 3) + 0.002 * Math.cos(a * 7);
    const r2 = r1 * 0.7;
    pts.push(makePt(51.505 + r1 * Math.cos(a), -0.09 + r2 * Math.sin(a) * 1.4));
  }
  return pts;
}

function genSwitchback(): LatLng[] {
  const pts: LatLng[] = [makePt(51.5, -0.09)];
  let lat = 51.5, lng = -0.09;
  for (let i = 1; i <= 200; i++) {
    const t = i / 200;
    const dir = Math.floor(i / 12) % 2 === 0 ? 1 : -1;
    lat += 0.0009 * (1 - t * 0.3) + 0.00015 * Math.sin(i * 1.2);
    lng += dir * 0.0007 + 0.0003 * Math.cos(i * 0.6);
    pts.push(makePt(lat, lng));
  }
  return pts;
}

function genNarrowLong(): LatLng[] {
  const pts: LatLng[] = [];
  for (let i = 0; i <= 160; i++) {
    const t = i / 160;
    pts.push(makePt(51.48 + t * 0.06 + 0.003 * Math.sin(t * 20), -0.09 + 0.002 * Math.cos(t * 15)));
  }
  return pts;
}

function genBigRide(): LatLng[] {
  const pts: LatLng[] = [];
  for (let i = 0; i <= 300; i++) {
    const t = i / 300;
    const a = t * Math.PI * 4;
    const r = 0.04 + 0.015 * Math.sin(a * 0.8) + 0.008 * Math.cos(a * 2.3);
    pts.push(makePt(51.52 + r * Math.cos(a), -0.1 + r * Math.sin(a) * 1.3));
  }
  return pts;
}

export function addActivity(act: Activity): void {
  ACTIVITIES.unshift(act);
}

export const ACTIVITIES: Activity[] = [
  {
    id: 'run-loop', name: 'Morning 10K', activityType: 'Run',
    startDate: '2024-03-15T07:30:00Z', distance: 10240, movingTime: 3180,
    elapsedTime: 3420, averageSpeed: 3.22, maxSpeed: 4.1,
    elevationGain: 87, maxElevation: 142, calories: 612,
    heartRate: { avg: 158, max: 178 }, routeCoordinates: genLoop(),
  },
  {
    id: 'hike-switchback', name: 'Mountain Trail', activityType: 'Hike',
    startDate: '2024-03-10T06:45:00Z', distance: 14200, movingTime: 14400,
    elapsedTime: 16200, averageSpeed: 0.99, maxSpeed: 2.1,
    elevationGain: 1240, maxElevation: 2180, calories: 1050,
    heartRate: { avg: 128, max: 161 }, routeCoordinates: genSwitchback(),
  },
  {
    id: 'sprint', name: 'Track Sprint', activityType: 'Run',
    startDate: '2024-02-20T18:00:00Z', distance: 1200, movingTime: 290,
    elapsedTime: 310, averageSpeed: 4.14, maxSpeed: 7.2,
    elevationGain: 2, maxElevation: 28, calories: 95,
    heartRate: { avg: 172, max: 194 }, routeCoordinates: genNarrowLong(),
  },
  {
    id: 'big-ride', name: 'Sunday Century', activityType: 'Ride',
    startDate: '2024-03-17T09:00:00Z', distance: 80500, movingTime: 10800,
    elapsedTime: 11400, averageSpeed: 7.45, maxSpeed: 12.8,
    elevationGain: 620, maxElevation: 385, calories: 2180,
    heartRate: { avg: 142, max: 172 }, routeCoordinates: genBigRide(),
  },
];
