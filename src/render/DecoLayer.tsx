import { View } from 'react-native';
import { DecoObject } from '../scene/types';

export function DecoLayer({ obj, scale }: { obj: DecoObject; scale: number }) {
  const s = (obj.size || 40) * scale;
  const color = obj.fillColor || obj.color || '#FFFFFF';
  const lineWidth = (obj.lineWidth || 1.5) * scale;

  if (obj.shape === 'ring') {
    return <View style={{ width: s, height: s, borderRadius: s / 2, borderWidth: lineWidth, borderColor: color }} />;
  }
  if (obj.shape === 'circle') {
    return <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: color }} />;
  }
  if (obj.shape === 'line') {
    return <View style={{ width: s, height: lineWidth, backgroundColor: color }} />;
  }
  if (obj.shape === 'dot-grid') {
    const spacing = (obj.spacing || 32) * scale;
    const count = obj.count || 4;
    const dotSize = 5 * scale;
    const dots = [];
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        dots.push(
          <View
            key={`${r}-${c}`}
            style={{
              position: 'absolute',
              left: c * spacing,
              top: r * spacing,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
            }}
          />
        );
      }
    }
    return <View style={{ width: spacing * count, height: spacing * count }}>{dots}</View>;
  }
  return null;
}
