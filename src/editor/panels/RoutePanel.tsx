import { Dispatch } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SceneAction } from '../../scene/sceneReducer';
import { ROUTE_STYLE_PRESETS } from '../../scene/defaultScene';
import { AnimType, RouteObject } from '../../scene/types';
import { ChipSelect, ColorField, ColorSwatch, Label, QUICK_COLORS, Row, SectionDivider, SegmentedControl, Toggle } from '../controls/Basics';
import { Slider } from '../controls/Slider';
import { C } from '../theme';

const ENTRANCE_TYPES: { id: AnimType; label: string }[] = [
  { id: 'draw', label: 'Draw' },
  { id: 'fadeIn', label: 'Fade In' },
  { id: 'scaleIn', label: 'Zoom In' },
  { id: 'pop', label: 'Pop' },
  { id: 'tumble', label: 'Tumble' },
  { id: 'slideUp', label: 'Swipe Up' },
  { id: 'slideDown', label: 'Swipe Down' },
  { id: 'slideLeft', label: 'Swipe Left' },
  { id: 'slideRight', label: 'Swipe Right' },
  { id: 'none', label: 'None' },
];

export function RoutePanel({ obj, dispatch, sceneDuration }: { obj: RouteObject | undefined; dispatch: Dispatch<SceneAction>; sceneDuration: number }) {
  if (!obj) return <Text style={styles.empty}>Select the route object to edit.</Text>;

  const upd = (patch: Record<string, unknown>) => dispatch({ type: 'UPDATE_OBJ', id: obj.id, patch });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Label>Style preset</Label>
      <Row style={styles.presetRow}>
        {ROUTE_STYLE_PRESETS.map((s) => {
          const active = obj.color === s.color && obj.lineStyle === s.lineStyle;
          return (
            <Pressable
              key={s.id}
              onPress={() =>
                upd({
                  color: s.color, thickness: s.thickness, showGlow: s.showGlow,
                  glowBlur: s.glowBlur ?? obj.glowBlur, glowAlpha: s.glowAlpha ?? obj.glowAlpha,
                  showGradient: s.showGradient, gradColor: s.gradColor ?? obj.gradColor, lineStyle: s.lineStyle,
                })
              }
              style={[styles.presetBtn, active && styles.presetBtnActive]}
            >
              <Text style={styles.presetBtnText}>{s.label}</Text>
            </Pressable>
          );
        })}
      </Row>

      <Label>Color</Label>
      <Row style={styles.colorRow}>
        {QUICK_COLORS.map((c) => (
          <ColorSwatch key={c} color={c} selected={obj.color === c} onPress={() => upd({ color: c })} />
        ))}
      </Row>
      <ColorField label="Custom" value={obj.color} onChange={(v) => upd({ color: v })} />

      <Slider label="Thickness" value={obj.thickness} min={1} max={20} step={0.5} onChange={(v) => upd({ thickness: v })} format={(v) => `${v}px`} />
      <Slider label="Opacity" value={obj.opacity} min={0} max={1} step={0.05} onChange={(v) => upd({ opacity: v })} format={(v) => `${Math.round(v * 100)}%`} />
      <Slider label="Route scale" value={obj.routeScale} min={0.3} max={1.0} step={0.01} onChange={(v) => upd({ routeScale: v })} format={(v) => `${Math.round(v * 100)}%`} />
      <Slider label="Offset X" value={obj.routeOffsetX} min={-400} max={400} step={5} onChange={(v) => upd({ routeOffsetX: v })} format={(v) => `${v}px`} />
      <Slider label="Offset Y" value={obj.routeOffsetY} min={-600} max={600} step={5} onChange={(v) => upd({ routeOffsetY: v })} format={(v) => `${v}px`} />

      <SectionDivider label="Line style" />
      <SegmentedControl
        options={[{ id: 'solid', label: 'Solid' }, { id: 'dashed', label: 'Dashed' }, { id: 'dotted', label: 'Dotted' }]}
        value={obj.lineStyle}
        onChange={(v) => upd({ lineStyle: v })}
      />

      <SectionDivider label="Effects" />
      <Toggle label="Glow" value={obj.showGlow} onChange={(v) => upd({ showGlow: v })} />
      {obj.showGlow && (
        <>
          <Slider label="Glow blur" value={obj.glowBlur} min={4} max={60} step={1} onChange={(v) => upd({ glowBlur: v })} />
          <Slider label="Glow intensity" value={obj.glowAlpha} min={0.05} max={0.8} step={0.05} onChange={(v) => upd({ glowAlpha: v })} format={(v) => `${Math.round(v * 100)}%`} />
        </>
      )}
      <Toggle label="Gradient" value={obj.showGradient} onChange={(v) => upd({ showGradient: v })} />
      {obj.showGradient && (
        <>
          <ColorField label="Start color" value={obj.gradColorStart} onChange={(v) => upd({ gradColorStart: v })} />
          <ColorField label="End color" value={obj.gradColor} onChange={(v) => upd({ gradColor: v })} />
        </>
      )}
      <Toggle label="Outline" value={obj.showOutline} onChange={(v) => upd({ showOutline: v })} />
      {obj.showOutline && (
        <>
          <ColorField label="Outline color" value={obj.outlineColor} onChange={(v) => upd({ outlineColor: v })} />
          <Slider label="Outline width" value={obj.outlineWidth} min={1} max={20} step={0.5} onChange={(v) => upd({ outlineWidth: v })} format={(v) => `${v}px`} />
        </>
      )}
      <Toggle label="Start dot" value={obj.dotStart} onChange={(v) => upd({ dotStart: v })} />
      <Toggle label="End dot" value={obj.dotEnd} onChange={(v) => upd({ dotEnd: v })} />
      <Toggle label="Moving marker" value={!!obj.showMarker} onChange={(v) => upd({ showMarker: v })} />
      {obj.showMarker && <Toggle label="Marker glow" value={!!obj.markerGlow} onChange={(v) => upd({ markerGlow: v })} />}

      <SectionDivider label="Animation" />
      <Label>Entrance</Label>
      <ChipSelect
        options={ENTRANCE_TYPES}
        value={(obj.anim?.type as AnimType) ?? 'draw'}
        onChange={(v) => upd({ anim: { ...obj.anim, type: v } })}
      />
      {obj.anim?.type && obj.anim.type !== 'none' && (
        <>
          <Slider label="Delay" value={obj.anim?.delay || 0} min={0} max={Math.max(0, sceneDuration - 0.5)} step={0.1} onChange={(v) => upd({ anim: { ...obj.anim, delay: v } })} format={(v) => `${v.toFixed(1)}s`} />
          <Slider label="Duration" value={obj.anim?.duration || 2} min={0.2} max={sceneDuration} step={0.1} onChange={(v) => upd({ anim: { ...obj.anim, duration: v } })} format={(v) => `${v.toFixed(1)}s`} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
  },
  empty: {
    padding: 16,
    color: C.textMuted,
    fontSize: 13,
  },
  presetRow: {
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  presetBtn: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  presetBtnActive: {
    backgroundColor: C.accentMuted,
    borderColor: C.accent,
  },
  presetBtnText: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '600',
  },
  colorRow: {
    flexWrap: 'wrap',
    rowGap: 8,
    marginBottom: 10,
  },
});
