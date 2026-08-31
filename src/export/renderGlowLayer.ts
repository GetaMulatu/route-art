import { Activity } from '../data/activities';
import { projectCoords } from '../geo/projection';
import { getRouteDrawFrac } from '../scene/animation';
import { buildSmoothPath, parameterizePath, pointsToSvgPath } from '../scene/path';
import { RouteObject } from '../scene/types';

function mixHex(hexA: string, hexB: string, t: number): string {
  const a = parseInt(hexA.replace('#', ''), 16);
  const b = parseInt(hexB.replace('#', ''), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

// html2canvas renders SVG path/stroke geometry fine but silently drops
// <feGaussianBlur> filters entirely (verified: exported glow was ~invisible
// vs. the live preview's soft halo). Rather than rebuild the whole scene as
// a parallel renderer, this renders just the glow geometry (duplicating the
// small subset of RouteLayer's math that feeds it, not RouteLayer itself —
// the live component is left untouched) as a standalone SVG document and
// rasterizes it via a real <img> decode, which DOES apply the filter
// correctly since it's genuine browser SVG rendering, not html2canvas's
// approximation. The result gets composited underneath the html2canvas
// capture in exportTransparentPng.
//
// Known gap: a glowing marker (obj.showMarker && obj.markerGlow) isn't
// included here — the default scene doesn't use it, and it's a rare
// secondary case; add it here if it turns out to matter.
export async function renderGlowLayer(
  obj: RouteObject,
  activity: Activity | undefined,
  timeS: number,
  canvasW: number,
  canvasH: number,
  scale: number
): Promise<HTMLCanvasElement | null> {
  if (!obj.showGlow) return null;
  if (!activity?.routeCoordinates || activity.routeCoordinates.length < 2) return null;

  const pts = projectCoords(
    activity.routeCoordinates,
    canvasW * scale,
    canvasH * scale,
    obj.routeScale,
    obj.routeOffsetX * scale,
    obj.routeOffsetY * scale
  );
  const segs = buildSmoothPath(pts, 0.35);
  const paramData = parameterizePath(segs, 300);
  const drawFrac = getRouteDrawFrac(obj.anim, timeS);
  const n = Math.max(2, Math.floor(paramData.pts.length * drawFrac));
  const clipped = paramData.pts.slice(0, n);
  if (clipped.length < 2) return null;

  const thickness = obj.thickness * scale;
  const glowStdDev = (obj.glowBlur || 18) * scale * 0.5;
  const glowStrokeWidth = thickness + glowStdDev * 3;
  const glowAlpha = obj.glowAlpha || 0.6;

  let pathsMarkup: string;
  if (obj.showGradient) {
    const totalPts = paramData.pts.length;
    const step = Math.max(1, Math.floor(clipped.length / 70));
    const parts: string[] = [];
    for (let i = 0; i < clipped.length - 1; i += step) {
      const segEnd = Math.min(clipped.length - 1, i + step);
      const segPts = clipped.slice(i, segEnd + 1);
      if (segPts.length < 2) continue;
      const t = totalPts > 1 ? i / (totalPts - 1) : 0;
      const color = mixHex(obj.gradColorStart || obj.color, obj.gradColor, t);
      parts.push(
        `<path d="${pointsToSvgPath(segPts)}" stroke="${color}" stroke-width="${glowStrokeWidth}" stroke-opacity="${glowAlpha}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    }
    pathsMarkup = parts.join('');
  } else {
    const dPath = pointsToSvgPath(clipped);
    pathsMarkup = `<path d="${dPath}" stroke="${obj.color}" stroke-width="${glowStrokeWidth}" stroke-opacity="${glowAlpha}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  const w = canvasW * scale;
  const h = canvasH * scale;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${glowStdDev}"/></filter></defs><g filter="url(#glow)">${pathsMarkup}</g></svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
