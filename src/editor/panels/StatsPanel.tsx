import { Dispatch } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { STAT_IDS, STAT_LABELS } from '../../data/format';
import { SceneAction } from '../../scene/sceneReducer';
import { AnimType, StatsGroupObject } from '../../scene/types';
import { ChipSelect, ColorField, Label, SectionDivider, SegmentedControl } from '../controls/Basics';
import { Slider } from '../controls/Slider';
import { C } from '../theme';

const ENTRANCE_TYPES: { id: AnimType; label: string }[] = [
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

export function StatsPanel({ obj, dispatch }: { obj: StatsGroupObject | undefined; dispatch: Dispatch<SceneAction> }) {
  if (!obj) return null;

  const upd = (patch: Record<string, unknown>) => dispatch({ type: 'UPDATE_OBJ', id: obj.id, patch });
  const enabledIds = obj.stats.map((s) => s.id);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SegmentedControl
        options={[{ id: 'metric', label: 'Metric' }, { id: 'imperial', label: 'Imperial' }]}
        value={obj.imperial ? 'imperial' : 'metric'}
        onChange={(v) => upd({ imperial: v === 'imperial' })}
      />

      <SectionDivider label="Active stats" />
      <View style={styles.statGrid}>
        {STAT_IDS.map((id) => {
          const active = enabledIds.includes(id);
          const toggle = () => {
            const newStats = active
              ? obj.stats.filter((s) => s.id !== id)
              : [...obj.stats, { id, anim: { type: 'countUp' as const, delay: obj.anim?.delay ?? 2.8, duration: obj.stats[0]?.anim?.duration ?? 1.0, easeFunc: 'easeOut' as const } }];
            upd({ stats: newStats });
          };
          return (
            <Pressable key={id} onPress={toggle} style={styles.statRow}>
              <View style={[styles.checkbox, active && styles.checkboxActive]} />
              <Text style={[styles.statLabel, active && styles.statLabelActive]}>{STAT_LABELS[id]}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionDivider label="Layout" />
      <SegmentedControl
        options={[{ id: 'grid', label: 'Grid' }, { id: 'list', label: 'List' }]}
        value={obj.layout}
        onChange={(v) => upd({ layout: v, cols: v === 'grid' ? 2 : 1 })}
      />

      <Slider label="Value size" value={obj.valueFontSize} min={24} max={120} step={2} onChange={(v) => upd({ valueFontSize: v })} format={(v) => `${v}px`} />
      <Slider label="Label size" value={obj.labelFontSize} min={10} max={40} step={1} onChange={(v) => upd({ labelFontSize: v })} format={(v) => `${v}px`} />
      <Slider label="Row gap" value={obj.rowGap} min={8} max={80} step={2} onChange={(v) => upd({ rowGap: v })} format={(v) => `${v}px`} />

      <SectionDivider label="Colors" />
      <ColorField label="Value" value={obj.color} onChange={(v) => upd({ color: v })} />

      <SectionDivider label="Animation" />
      <Label>Entrance</Label>
      <ChipSelect
        options={ENTRANCE_TYPES}
        value={(obj.anim?.type as AnimType) ?? 'slideUp'}
        onChange={(v) => upd({ anim: { ...obj.anim, type: v } })}
      />
      {obj.anim?.type && obj.anim.type !== 'none' && (
        <Slider
          label="Entrance duration"
          value={obj.anim?.duration ?? 0.6}
          min={0.2} max={2} step={0.1}
          onChange={(v) => upd({ anim: { ...obj.anim, duration: v } })}
          format={(v) => `${v.toFixed(1)}s`}
        />
      )}
      <Slider
        label="Start delay"
        value={obj.anim?.delay ?? 2.6}
        min={0} max={12} step={0.1}
        onChange={(v) => {
          const oldDelay = obj.anim?.delay ?? 2.6;
          const delta = v - oldDelay;
          upd({
            anim: { ...obj.anim, delay: Math.round(v * 10) / 10 },
            stats: obj.stats.map((s) => ({
              ...s,
              anim: s.anim ? { ...s.anim, delay: Math.max(0, Math.round(((s.anim.delay || 0) + delta) * 10) / 10) } : s.anim,
            })),
          });
        }}
        format={(v) => `${v.toFixed(1)}s`}
      />
      <Slider
        label="Count-up duration"
        value={obj.stats[0]?.anim?.duration ?? 1.0}
        min={0.2} max={4} step={0.1}
        onChange={(v) => {
          upd({
            stats: obj.stats.map((s) => ({
              ...s,
              anim: s.anim ? { ...s.anim, duration: Math.round(v * 10) / 10 } : s.anim,
            })),
          });
        }}
        format={(v) => `${v.toFixed(1)}s`}
      />

      <SectionDivider label="Position" />
      <Slider label="Offset X" value={obj.x} min={-200} max={1000} step={10} onChange={(v) => upd({ x: v })} format={(v) => `${v.toFixed(1)}px`} />
      <Slider label="Offset Y" value={obj.y} min={400} max={1800} step={10} onChange={(v) => upd({ y: v })} format={(v) => `${v.toFixed(1)}px`} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    width: '50%',
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  checkboxActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  statLabel: {
    fontSize: 11,
    color: C.textSub,
  },
  statLabelActive: {
    color: C.text,
  },
});
