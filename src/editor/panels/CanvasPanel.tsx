import { Dispatch } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { PRESETS } from '../../scene/defaultScene';
import { SceneAction } from '../../scene/sceneReducer';
import { Scene } from '../../scene/types';
import { Label, Row, SectionDivider } from '../controls/Basics';
import { Slider } from '../controls/Slider';
import { C } from '../theme';

async function pickBackground(type: 'image' | 'video', dispatch: Dispatch<SceneAction>) {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
  }
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? ['images'] : ['videos'],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    dispatch({ type: 'SET_BACKGROUND', background: { type, uri: result.assets[0].uri } });
  } catch (e) {
    console.error('Background pick failed:', e);
  }
}

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

      <SectionDivider label="Background" />
      {scene.background ? (
        <>
          <Row style={styles.bgRow}>
            <Text style={styles.bgLabel}>{scene.background.type === 'image' ? '🖼 Photo' : '🎬 Video'} set</Text>
          </Row>
          <Row>
            <Pressable style={styles.bgBtn} onPress={() => pickBackground(scene.background!.type, dispatch)}>
              <Text style={styles.bgBtnText}>Replace</Text>
            </Pressable>
            <Pressable style={styles.bgBtn} onPress={() => dispatch({ type: 'CLEAR_BACKGROUND' })}>
              <Text style={styles.bgBtnText}>Remove</Text>
            </Pressable>
          </Row>
        </>
      ) : (
        <Row>
          <Pressable style={styles.bgBtn} onPress={() => pickBackground('image', dispatch)}>
            <Text style={styles.bgBtnText}>Add Photo</Text>
          </Pressable>
          <Pressable style={styles.bgBtn} onPress={() => pickBackground('video', dispatch)}>
            <Text style={styles.bgBtnText}>Add Video</Text>
          </Pressable>
        </Row>
      )}
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
  bgRow: {
    marginBottom: 8,
  },
  bgLabel: {
    color: C.textSub,
    fontSize: 12,
  },
  bgBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    alignItems: 'center',
  },
  bgBtnText: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
  },
});
