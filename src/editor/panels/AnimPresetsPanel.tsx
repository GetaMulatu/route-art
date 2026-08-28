import { Dispatch } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ANIMATION_PRESETS } from '../../scene/defaultScene';
import { SceneAction } from '../../scene/sceneReducer';
import { Scene } from '../../scene/types';
import { Label } from '../controls/Basics';
import { C } from '../theme';

export function AnimPresetsPanel({ scene, dispatch }: { scene: Scene; dispatch: Dispatch<SceneAction> }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Label>Animation presets</Label>
      <View style={styles.list}>
        {ANIMATION_PRESETS.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => {
              const newScene = p.apply(scene);
              newScene.objects.forEach((o) => dispatch({ type: 'UPDATE_OBJ', id: o.id, patch: o }));
              dispatch({ type: 'SET_DURATION', v: newScene.duration });
            }}
            style={styles.presetBtn}
          >
            <Text style={styles.presetLabel}>{p.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
  },
  list: {
    gap: 6,
    marginBottom: 16,
  },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    backgroundColor: '#161616',
  },
  presetLabel: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
  },
});
