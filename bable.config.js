import { Canvas, Circle, Path, Skia, LinearGradient, vec, BlurMask, Paint } from '@shopify/react-native-skia';
import { useWindowDimensions } from 'react-native';
import { projectCoords, buildSkiaPath, genSampleLoop } from '../geo/projection';

interface RouteCanvasProps {
  color?: string;
  gradientEnd?: string;
  thickness?: number;
  showGlow?: boolean;
  progress?: number;
}

export function RouteCanvas({
  color = '#FC4C02',
  gradientEnd = '#7B2FFF',
  thickness = 4,
  showGlow = true,
  progress = 1,
}: RouteCanvasProps) {
  const { width, height } = useWindowDimensions();
  const coords = genSampleLoop();
  const pts = projectCoords(coords, width, height, 0.78);
  const clippedPts = pts.slice(0, Math.max(2, Math.floor(pts.length * progress)));
  const pathStr = buildSkiaPath(clippedPts);
  if (!pathStr) return null;
  const skiaPath = Skia.Path.MakeFromSVGString(pathStr);
  if (!skiaPath) return null;

  const startPt = pts[0];
  const midPt = pts[Math.floor(pts.length * 0.5)];

  return (
    <Canvas style={{ flex: 1 }}>
      {showGlow && (
        <Path
          path={skiaPath}
          style="stroke"
          strokeWidth={thickness * 2.5}
          strokeCap="round"
          strokeJoin="round"
          opacity={0.3}
        >
          <Paint color={color}>
            <BlurMask blur={12} style="normal" />
          </Paint>
        </Path>
      )}
      <Path
        path={skiaPath}
        style="stroke"
        strokeWidth={thickness}
        strokeCap="round"
        strokeJoin="round"
      >
        <LinearGradient
          start={vec(startPt.x, startPt.y)}
          end={vec(midPt.x, midPt.y)}
          colors={[color, gradientEnd]}
        />
      </Path>
      {startPt && (
        <Circle cx={startPt.x} cy={startPt.y} r={thickness * 1.8} color={color} />
      )}
    </Canvas>
  );
}