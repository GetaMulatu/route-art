import { Dispatch } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PRESETS } from '../../scene/defaultScene';
import { SceneAction } from '../../scene/sceneReducer';
import { Scene } from '../../scene/types';
import { Label, Row, SectionDivider } from '../controls/Basics';
import { Slider } from '../controls/Slider';
import { C } from '../theme';

export function CanvasPanel({ scene, dispatch }: { scene: Scene; dispatch: Dispatch<SceneAction> }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Label>Preset</Label>
      <View style={styles.presetList}>
        {PRESETS.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => dispatch({ type: 'SET_CANVAS', preset: p.id })}
            style={[styles.presetRow, scene.canvasPreset === p.id && styles.presetRowActive]}
          >
            <Text style={styles.presetLabel}>{p.icon} {p.label}</Text>
            <Text style={styles.presetDims}>
              {p.id === 'custom' ? `${scene.canvasW}×${scene.canvasH}` : `${p.w}×${p.h}`}
            </Text>
          </Pressable>
        ))}
      </View>

      {scene.canvasPreset === 'custom' && (
        <>
          <SectionDivider label="Custom size" />
          <Row>
            <View style={{ flex: 1 }}>
              <Label>W</Label>
              <TextInput
                keyboardType="numeric"
                value={String(scene.canvasW)}
                onChangeText={(t) => dispatch({ type: 'SET_CUSTOM_CANVAS', w: Number(t) || scene.canvasW, h: scene.canvasH })}
                style={styles.numInput}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Label>H</Label>
              <TextInput
                keyboardType="numeric"
                value={String(scene.canvasH)}
                onChangeText={(t) => dispatch({ type: 'SET_CUSTOM_CANVAS', w: scene.canvasW, h: Number(t) || scene.canvasH })}
                style={styles.numInput}
              />
            </View>
          </Row>
        </>
      )}

      <SectionDivider label="Duration" />
      <Slider label="Animation duration" value={scene.duration} min={1} max={12} step={0.5} onChange={(v) => dispatch({ type: 'SET_DURATION', v })} format={(v) => `${v.toFixed(1)}s`} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
  },
  presetList: {
    gap: 5,
    marginBottom: 14,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  presetRowActive: {
    backgroundColor: C.accentMuted,
    borderColor: C.accent,
  },
  presetLabel: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
  },
  presetDims: {
    color: C.textMuted,
    fontSize: 11,
  },
  numInput: {
    color: C.text,
    fontSize: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#181818',
  },
});
