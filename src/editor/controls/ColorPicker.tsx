import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { HSV, hsvToHex } from './color';
import { usePan2D } from './usePan2D';
import { useDragTrack } from './useDragTrack';
import { C } from '../theme';

const SQUARE_H = 120;
const HUE_H = 16;

export function SVSquare({ hsv, onChange }: { hsv: HSV; onChange: (s: number, v: number) => void }) {
  const { containerRef, panHandlers, onLayout } = usePan2D((fx, fy) => {
    onChange(fx, 1 - fy);
  });
  const hueColor = hsvToHex({ h: hsv.h, s: 1, v: 1 });

  return (
    <View
      ref={containerRef}
      onLayout={onLayout}
      {...panHandlers}
      style={styles.square}
    >
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="satGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="valGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#000000" stopOpacity={1} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={hueColor} />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#satGrad)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#valGrad)" />
      </Svg>
      <View
        style={[
          styles.svThumb,
          { left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: hsvToHex(hsv), pointerEvents: 'none' },
        ]}
      />
    </View>
  );
}

export function HueStrip({ hue, onChange }: { hue: number; onChange: (h: number) => void }) {
  const { containerRef, panHandlers, onLayout } = useDragTrack((f) => onChange(f * 360));

  return (
    <View ref={containerRef} onLayout={onLayout} {...panHandlers} style={styles.hueTrack} hitSlop={{ top: 8, bottom: 8 }}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="hueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FF0000" />
            <Stop offset="17%" stopColor="#FFFF00" />
            <Stop offset="33%" stopColor="#00FF00" />
            <Stop offset="50%" stopColor="#00FFFF" />
            <Stop offset="67%" stopColor="#0000FF" />
            <Stop offset="83%" stopColor="#FF00FF" />
            <Stop offset="100%" stopColor="#FF0000" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" rx={HUE_H / 2} fill="url(#hueGrad)" />
      </Svg>
      <View style={[styles.hueThumb, { left: `${(hue / 360) * 100}%`, pointerEvents: 'none' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  square: {
    height: SQUARE_H,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  svThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  hueTrack: {
    height: HUE_H,
    borderRadius: HUE_H / 2,
    marginBottom: 10,
    overflow: 'visible',
  },
  hueThumb: {
    position: 'absolute',
    top: -2,
    width: HUE_H + 4,
    height: HUE_H + 4,
    marginLeft: -(HUE_H + 4) / 2,
    borderRadius: (HUE_H + 4) / 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
});
