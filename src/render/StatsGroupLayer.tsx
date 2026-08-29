import { StyleSheet, Text, View } from 'react-native';
import { Activity } from '../data/activities';
import { STAT_LABELS, getStatValue } from '../data/format';
import { getCountUpValue } from '../scene/animation';
import { StatsGroupObject } from '../scene/types';

export function StatsGroupLayer({
  obj,
  activity,
  timeS,
  scale,
}: {
  obj: StatsGroupObject;
  activity: Activity | undefined;
  timeS: number;
  scale: number;
}) {
  const groupDelay = obj.anim?.delay ?? 0;
  if (timeS < groupDelay) return null;

  const cols = obj.cols || 2;
  const rows = Math.ceil(obj.stats.length / cols);

  const valueFontSize = obj.valueFontSize * scale;
  const labelFontSize = obj.labelFontSize * scale;
  const rowGap = obj.rowGap * scale;
  const lineGap = obj.lineGap * scale;
  const rowH = valueFontSize + labelFontSize + lineGap + rowGap;

  // Independent of x/y so dragging the group repositions it without
  // resizing its columns (overflow past the canvas edge just clips via
  // SceneCanvas's overflow:hidden, same as every other draggable object).
  const colW = (obj.width * scale) / cols;

  return (
    // Every row below is position:'absolute', which would otherwise leave
    // this View at its default 0x0 intrinsic size — sizing it explicitly
    // gives the group a real, draggable hit area matching its visible grid.
    <View style={{ width: colW * cols, height: rowH * rows }}>
      {obj.stats.map((stat, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const sx = col * colW;
        const sy = row * rowH;
        const statDelay = stat.anim?.delay ?? groupDelay;
        if (timeS < statDelay) return null;

        const value =
          stat.anim?.type === 'countUp'
            ? getCountUpValue(stat.id, stat.anim, activity, timeS, obj.imperial)
            : getStatValue(activity, stat.id, obj.imperial);
        if (value === null) return null;

        const fadeT = Math.min(1, (timeS - statDelay) / 0.25);

        return (
          <View key={stat.id} style={[styles.stat, { left: sx, top: sy, opacity: fadeT }]}>
            <Text numberOfLines={1} style={[styles.label, { color: obj.labelColor, fontSize: labelFontSize }]}>
              {STAT_LABELS[stat.id] || stat.id.toUpperCase()}
            </Text>
            <Text numberOfLines={1} style={[styles.value, { color: obj.color, fontSize: valueFontSize, marginTop: lineGap }]}>
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    position: 'absolute',
  },
  label: {
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  value: {
    fontWeight: '700',
  },
});
