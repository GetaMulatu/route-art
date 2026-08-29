import { StyleSheet, Text, View } from 'react-native';
import { Activity } from '../data/activities';
import { STAT_LABELS, getStatValue } from '../data/format';
import { getCountUpValue } from '../scene/animation';
import { StatsGroupObject } from '../scene/types';

export function StatsGroupLayer({
  obj,
  activity,
  timeS,
  canvasW,
  canvasH,
  scale,
}: {
  obj: StatsGroupObject;
  activity: Activity | undefined;
  timeS: number;
  canvasW: number;
  canvasH: number;
  scale: number;
}) {
  const groupDelay = obj.anim?.delay ?? 0;
  if (timeS < groupDelay) return null;

  const cols = obj.cols || 2;
  const rows = Math.ceil(obj.stats.length / cols);

  let valueFontSize = obj.valueFontSize * scale;
  let labelFontSize = obj.labelFontSize * scale;
  let rowGap = obj.rowGap * scale;
  let lineGap = obj.lineGap * scale;
  let rowH = valueFontSize + labelFontSize + lineGap + rowGap;

  // A layout with few columns (e.g. List mode) needs proportionally more
  // rows for the same stat count, and can overflow past the canvas edge
  // (clipped by SceneCanvas's overflow:hidden) with no visible warning.
  // Shrink text/spacing uniformly to fit the space actually available
  // below the group's start position rather than letting it clip silently.
  const availableH = canvasH * scale - obj.y * scale;
  const naturalH = rows * rowH;
  if (availableH > 0 && naturalH > availableH) {
    const shrink = availableH / naturalH;
    valueFontSize *= shrink;
    labelFontSize *= shrink;
    rowGap *= shrink;
    lineGap *= shrink;
    rowH *= shrink;
  }

  const colW = (canvasW * scale - obj.x * scale * 2) / cols;

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
