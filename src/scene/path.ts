import { Point } from '../geo/projection';

export interface BezierSeg {
  p1: Point;
  cp1: Point;
  cp2: Point;
  p2: Point;
}

export function buildSmoothPath(pts: Point[], tension = 0.4): BezierSeg[] {
  if (pts.length < 2) return [];
  const segs: BezierSeg[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    segs.push({ p1, cp1: { x: cp1x, y: cp1y }, cp2: { x: cp2x, y: cp2y }, p2 });
  }
  return segs;
}

export function bezierPt(seg: BezierSeg, t: number): Point {
  const { p1, cp1, cp2, p2 } = seg;
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p1.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * p2.x,
    y: mt * mt * mt * p1.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * p2.y,
  };
}

export interface ParamTableEntry {
  t: number;
  len: number;
}

export interface ParamData {
  pts: Point[];
  table: ParamTableEntry[];
  total: number;
}

export function parameterizePath(segs: BezierSeg[], resolution = 200): ParamData {
  const pts: Point[] = [];
  const totalSegs = segs.length;
  for (let s = 0; s < totalSegs; s++) {
    const steps = Math.max(4, Math.floor(resolution / totalSegs));
    for (let i = 0; i <= steps; i++) {
      pts.push(bezierPt(segs[s], i / steps));
    }
  }
  const table: ParamTableEntry[] = [{ t: 0, len: 0 }];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
    table.push({ t: i / (pts.length - 1), len: total });
  }
  return { pts, table, total };
}

export function getPtAtFraction(paramData: ParamData, frac: number): Point {
  const target = frac * paramData.total;
  let lo = 0, hi = paramData.table.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (paramData.table[mid].len < target) lo = mid; else hi = mid;
  }
  const a = paramData.table[lo], b = paramData.table[hi];
  const t2 = b.len === a.len ? 0 : (target - a.len) / (b.len - a.len);
  const idx = Math.round(a.t * (paramData.pts.length - 1) + t2 * (b.t - a.t) * (paramData.pts.length - 1));
  return paramData.pts[Math.min(idx, paramData.pts.length - 1)];
}

export function pointsToSvgPath(pts: Point[]): string {
  if (pts.length < 2) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}
