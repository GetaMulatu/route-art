import { StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';
import { useDragTrack } from './useDragTrack';

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const frac = max > min ? (value - min) / (max - min) : 0;

  const { containerRef, panHandlers, onLayout } = useDragTrack((f) => {
    const raw = min + f * (max - min);
    const stepped = Math.round(raw / step) * step;
    const clamped = Math.max(min, Math.min(max, stepped));
    onChange(Math.round(clamped * 1000) / 1000);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{format ? format(value) : String(value)}</Text>
      </View>
      <View ref={containerRef} onLayout={onLayout} {...panHandlers} style={styles.track} hitSlop={{ top: 10, bottom: 10 }}>
        <View style={[styles.fill, { width: `${frac * 100}%` }]} />
        <View style={[styles.thumb, { left: `${frac * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    fontSize: 11,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  value: {
    fontSize: 11,
    color: C.textSub,
    fontWeight: '600',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.border,
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  thumb: {
    position: 'absolute',
    marginLeft: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: C.accent,
  },
});
