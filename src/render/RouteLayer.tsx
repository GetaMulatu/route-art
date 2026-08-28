import { useMemo } from 'react';
import Svg, { Circle, Defs, FeGaussianBlur, Filter, Path } from 'react-native-svg';
import { Activity } from '../data/activities';
import { Point, projectCoords } from '../geo/projection';
import { getRouteDrawFrac } from '../scene/animation';
import { getPtAtFraction, parameterizePath, pointsToSvgPath, buildSmoothPath } from '../scene/path';
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

export function RouteLayer({
  obj,
  activity,
  timeS,
  canvasW,
  canvasH,
  scale,
}: {
  obj: RouteObject;
  activity: Activity | undefined;
  timeS: number;
  canvasW: number;
  canvasH: number;
  scale: number;
}) {
  const paramData = useMemo(() => {
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
    return parameterizePath(segs, 300);
  }, [activity, canvasW, canvasH, scale, obj.routeScale, obj.routeOffsetX, obj.routeOffsetY]);

  const drawFrac = getRouteDrawFrac(obj.anim, timeS);

  const clipped = useMemo(() => {
    if (!paramData) return [];
    const n = Math.max(2, Math.floor(paramData.pts.length * drawFrac));
    return paramData.pts.slice(0, n);
  }, [paramData, drawFrac]);

  // A true SVG <linearGradient> only interpolates along a straight line
  // between two points, projected onto the whole shape — for a closed-loop
  // route (a common case: any out-and-back or loop activity) the true start
  // and end coincide, collapsing that line to zero length, which per the
  // SVG spec paints the entire path as a solid color instead of a gradient.
  // Coloring the path in short segments — each segment's color interpolated
  // by its actual position along the path (arc-length fraction of the FULL
  // route, not just the currently drawn-in portion) — works for any route
  // shape, loop or not, and is unaffected by draw-in reveal progress.
  const gradSegments = useMemo(() => {
    if (!obj.showGradient || !paramData || clipped.length < 2) return null;
    const totalPts = paramData.pts.length;
    const step = Math.max(1, Math.floor(clipped.length / 70));
    const segs: { d: string; color: string }[] = [];
    for (let i = 0; i < clipped.length - 1; i += step) {
      const segEnd = Math.min(clipped.length - 1, i + step);
      const segPts = clipped.slice(i, segEnd + 1);
      if (segPts.length < 2) continue;
      const t = totalPts > 1 ? i / (totalPts - 1) : 0;
      segs.push({ d: pointsToSvgPath(segPts), color: mixHex(obj.gradColorStart || obj.color, obj.gradColor, t) });
    }
    return segs;
  }, [obj.showGradient, clipped, paramData, obj.gradColorStart, obj.gradColor, obj.color]);

  if (!paramData || clipped.length < 2) return null;

  const dPath = pointsToSvgPath(clipped);
  const thickness = obj.thickness * scale;
  const filterId = `glow-${obj.id}`;
  // The glow layer must be wider than the blur radius it's fed into, or the
  // blurred result dilutes to near-zero peak opacity and becomes invisible
  // (verified: a stroke much narrower than stdDeviation spreads its color
  // over so much more area that it reads as ~5% opacity even at full alpha).
  const glowStdDev = (obj.glowBlur || 18) * scale * 0.5;
  const glowStrokeWidth = thickness + glowStdDev * 3;

  const dashArray =
    obj.lineStyle === 'dashed'
      ? `${thickness * 2.5},${thickness * 2}`
      : obj.lineStyle === 'dotted'
        ? `${1},${thickness * 2.5}`
        : undefined;

  const start = clipped[0];
  const end = clipped[clipped.length - 1];
  const dotR = thickness * 1.6;
  const markerPt = obj.showMarker && drawFrac > 0 && drawFrac < 1 ? getPtAtFraction(paramData, drawFrac) : null;
  const markerR = (obj.markerSize || 8) * scale;

  return (
    <Svg width={canvasW * scale} height={canvasH * scale}>
      <Defs>
        {(obj.showGlow || (obj.showMarker && obj.markerGlow)) && (
          <Filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
            <FeGaussianBlur stdDeviation={glowStdDev} />
          </Filter>
        )}
      </Defs>

      {obj.showOutline && (
        <Path
          d={dPath}
          stroke={obj.outlineColor}
          strokeWidth={thickness + obj.outlineWidth * 2 * scale}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {obj.showGlow && (
        <Path
          d={dPath}
          stroke={obj.glowColor || obj.color}
          strokeWidth={glowStrokeWidth}
          strokeOpacity={obj.glowAlpha || 0.6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${filterId})`}
        />
      )}

      {gradSegments ? (
        gradSegments.map((seg, i) => (
          <Path
            key={i}
            d={seg.d}
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={dashArray}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))
      ) : (
        <Path
          d={dPath}
          stroke={obj.color}
          strokeWidth={thickness}
          strokeDasharray={dashArray}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {obj.showDots && obj.dotStart && <Circle cx={start.x} cy={start.y} r={dotR} fill={obj.color} />}
      {obj.showDots && obj.dotEnd && drawFrac > 0.95 && (
        <Circle cx={end.x} cy={end.y} r={dotR * 1.3} stroke={obj.color} strokeWidth={dotR * 0.55} fill="none" />
      )}

      {markerPt && (
        <Circle
          cx={markerPt.x}
          cy={markerPt.y}
          r={markerR}
          fill="#FFFFFF"
          stroke={obj.color}
          strokeWidth={markerR * 0.5}
          filter={obj.markerGlow ? `url(#${filterId})` : undefined}
        />
      )}
    </Svg>
  );
}
