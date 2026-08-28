import { Activity } from './activities';

export interface StatNumeric {
  value: number;
  suffix: string;
  decimals: number;
  isDuration?: boolean;
}

export const fmt = {
  dist: (m: number, imp: boolean) => {
    if (imp) {
      const mi = m / 1609.34;
      return mi.toFixed(2) + ' mi';
    }
    return (m / 1000).toFixed(2) + ' km';
  },
  dur: (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = Math.floor(s % 60);
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
  },
  speed: (mps: number, imp: boolean) => (imp ? (mps * 2.237).toFixed(1) + ' mph' : (mps * 3.6).toFixed(1) + ' km/h'),
  pace: (mps: number, imp: boolean, type: string) => {
    if (type === 'Ride') return fmt.speed(mps, imp);
    if (mps <= 0) return '—';
    const spk = imp ? 1609.34 / mps : 1000 / mps;
    return `${Math.floor(spk / 60)}:${String(Math.round(spk % 60)).padStart(2, '0')}${imp ? '/mi' : '/km'}`;
  },
  elev: (m: number, imp: boolean) => (imp ? Math.round(m * 3.281) + ' ft' : Math.round(m) + ' m'),
  date: (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
};

export function getStatValue(act: Activity | undefined, id: string, imp: boolean): string {
  if (!act) return '—';
  switch (id) {
    case 'distance': return fmt.dist(act.distance, imp);
    case 'duration': return fmt.dur(act.elapsedTime);
    case 'movingTime': return fmt.dur(act.movingTime);
    case 'avgSpeed': return fmt.speed(act.averageSpeed, imp);
    case 'maxSpeed': return fmt.speed(act.maxSpeed, imp);
    case 'avgPace': return fmt.pace(act.averageSpeed, imp, act.activityType);
    case 'maxElevation': return fmt.elev(act.maxElevation, imp);
    case 'elevationGain': return fmt.elev(act.elevationGain, imp) + ' ↑';
    case 'calories': return act.calories ? act.calories + ' cal' : '—';
    case 'avgHR': return act.heartRate?.avg ? act.heartRate.avg + ' bpm' : '—';
    case 'maxHR': return act.heartRate?.max ? act.heartRate.max + ' bpm' : '—';
    case 'activityType': return act.activityType;
    case 'date': return fmt.date(act.startDate);
    default: return '—';
  }
}

export function getStatNumeric(act: Activity | undefined, id: string, imp: boolean): StatNumeric {
  if (!act) return { value: 0, suffix: '', decimals: 0, isDuration: false };
  switch (id) {
    case 'distance': return { value: imp ? act.distance / 1609.34 : act.distance / 1000, suffix: imp ? ' mi' : ' km', decimals: 2 };
    case 'duration': return { value: act.elapsedTime, suffix: '', decimals: 0, isDuration: true };
    case 'movingTime': return { value: act.movingTime, suffix: '', decimals: 0, isDuration: true };
    case 'avgSpeed': return { value: imp ? act.averageSpeed * 2.237 : act.averageSpeed * 3.6, suffix: imp ? ' mph' : ' km/h', decimals: 1 };
    case 'maxSpeed': return { value: imp ? act.maxSpeed * 2.237 : act.maxSpeed * 3.6, suffix: imp ? ' mph' : ' km/h', decimals: 1 };
    case 'elevationGain': return { value: imp ? act.elevationGain * 3.281 : act.elevationGain, suffix: imp ? ' ft ↑' : ' m ↑', decimals: 0 };
    case 'maxElevation': return { value: imp ? act.maxElevation * 3.281 : act.maxElevation, suffix: imp ? ' ft' : ' m', decimals: 0 };
    case 'calories': return { value: act.calories || 0, suffix: ' cal', decimals: 0 };
    case 'avgHR': return { value: act.heartRate?.avg || 0, suffix: ' bpm', decimals: 0 };
    case 'maxHR': return { value: act.heartRate?.max || 0, suffix: ' bpm', decimals: 0 };
    default: return { value: 0, suffix: '', decimals: 0 };
  }
}

export const STAT_LABELS: Record<string, string> = {
  distance: 'DISTANCE', duration: 'DURATION', movingTime: 'MOVING TIME',
  avgSpeed: 'AVG SPEED', maxSpeed: 'MAX SPEED', avgPace: 'AVG PACE',
  maxElevation: 'MAX ELEVATION', elevationGain: 'ELEVATION GAIN', calories: 'CALORIES',
  avgHR: 'AVG HEART RATE', maxHR: 'MAX HEART RATE', activityType: 'ACTIVITY', date: 'DATE',
};

export const STAT_IDS = ['distance', 'duration', 'movingTime', 'avgSpeed', 'maxSpeed', 'avgPace', 'elevationGain', 'maxElevation', 'calories', 'avgHR', 'maxHR'];
