import { Activity } from '../data/activities';
import { fmt, getStatNumeric, getStatValue } from '../data/format';
import { AnimDescriptor, EaseFunc } from './types';

export const easing: Record<EaseFunc, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeOutBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) + 1;
  },
  easeOutBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

export function applyEasing(t: number, name: EaseFunc | undefined): number {
  const fn = (name && easing[name]) || easing.easeOut;
  return fn(Math.max(0, Math.min(1, t)));
}

export interface AnimValue {
  alpha?: number;
  scale?: number;
  rotate?: number;
  offsetX?: number;
  offsetY?: number;
}

export function getAnimValue(anim: AnimDescriptor | undefined, timeS: number, canvasW: number, canvasH: number): AnimValue {
  if (!anim || !anim.type || anim.type === 'none') return {};
  const { type, delay = 0, duration = 1, easeFunc = 'easeOut', loop = false } = anim;
  let t = (timeS - delay) / duration;
  if (loop && t > 0) t = t % 1;
  t = Math.max(0, Math.min(1, t));
  const e = applyEasing(t, easeFunc);

  switch (type) {
    case 'fadeIn': return { alpha: e };
    case 'fadeOut': return { alpha: 1 - e };
    case 'fadeInOut': return { alpha: t < 0.5 ? applyEasing(t * 2, easeFunc) : 1 - applyEasing((t - 0.5) * 2, easeFunc) };
    case 'scaleIn': return { alpha: e, scale: e };
    case 'pop': {
      const alpha = applyEasing(Math.min(1, t / 0.25), 'easeOut');
      const scale = applyEasing(t, 'easeOutBack');
      return { alpha, scale };
    }
    case 'pulse': { const v = 0.85 + 0.15 * Math.sin((timeS * Math.PI * 2) / (duration || 1)); return { alpha: v, scale: v }; }
    case 'breathing': {
      const { minS = 0.97, maxS = 1.03 } = anim;
      const v = minS + (maxS - minS) * (0.5 + 0.5 * Math.sin((timeS * Math.PI * 2) / (duration || 2)));
      return { alpha: v, scale: v };
    }
    case 'float': {
      const { amp = 12 } = anim;
      return { offsetY: amp * Math.sin((timeS * Math.PI * 2) / (duration || 3)) };
    }
    case 'slideUp': { const eb = applyEasing(t, 'easeOutBack'); return { offsetY: (1 - eb) * canvasH }; }
    case 'slideDown': { const eb = applyEasing(t, 'easeOutBack'); return { offsetY: -(1 - eb) * canvasH }; }
    case 'slideLeft': { const eb = applyEasing(t, 'easeOutBack'); return { offsetX: (1 - eb) * canvasW }; }
    case 'slideRight': { const eb = applyEasing(t, 'easeOutBack'); return { offsetX: -(1 - eb) * canvasW }; }
    case 'tumble': return { alpha: e, rotate: (1 - e) * -22, scale: 0.85 + 0.15 * e };
    default: return {};
  }
}

export function getRouteDrawFrac(anim: AnimDescriptor | undefined, timeS: number): number {
  if (!anim || anim.type !== 'draw') return 1;
  const { delay = 0, duration = 2, easeFunc = 'easeInOut', reverse = false } = anim;
  const t = Math.max(0, Math.min(1, (timeS - delay) / duration));
  const e = applyEasing(t, easeFunc);
  return reverse ? 1 - e : e;
}

export function getCountUpValue(
  statId: string,
  statAnim: AnimDescriptor | undefined,
  activity: Activity | undefined,
  timeS: number,
  imperial: boolean
): string | null {
  const num = getStatNumeric(activity, statId, imperial);
  if (!statAnim || statAnim.type !== 'countUp' || !num.value) {
    return activity ? getStatValue(activity, statId, imperial) : '—';
  }
  const { delay = 0, duration = 1.5, easeFunc = 'easeOut' } = statAnim;
  if (timeS < delay) return null;
  const t = applyEasing((timeS - delay) / duration, easeFunc);
  const cur = num.value * t;
  if (num.isDuration) return fmt.dur(Math.floor(cur)) + num.suffix;
  return cur.toFixed(num.decimals) + num.suffix;
}
