import { RefObject, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { exportTransparentPng } from '../../export/exportTransparentPng';
import { Scene } from '../../scene/types';
import { Label, SectionDivider } from '../controls/Basics';
import { C } from '../theme';

const MULTIPLIERS = [
  { m: 1, label: 'Standard' },
  { m: 2, label: 'Retina' },
  { m: 3, label: 'Print' },
];

export function ExportPanel({
  scene,
  canvasRef,
  timeS,
}: {
  scene: Scene;
  canvasRef: RefObject<View | null>;
  timeS: number;
}) {
  const [mult, setMult] = useState(2);
  const [status, setStatus] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle');

  const handleExport = async () => {
    if (status === 'exporting') return;
    setStatus('exporting');
    try {
      await exportTransparentPng(canvasRef, scene, timeS, scene.canvasW * mult, scene.canvasH * mult);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (e) {
      console.error('Export failed:', e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SectionDivider label="Static PNG" />
      <Label>Resolution</Label>
      <View style={styles.multList}>
        {MULTIPLIERS.map(({ m, label }) => (
          <Pressable key={m} onPress={() => setMult(m)} style={[styles.multRow, mult === m && styles.multRowActive]}>
            <Text style={styles.multLabel}>×{m} {label}</Text>
            <Text style={styles.multDims}>{scene.canvasW * m}×{scene.canvasH * m}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={handleExport} style={styles.exportBtn} disabled={status === 'exporting'}>
        {status === 'exporting' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.exportBtnText}>↓ Download PNG</Text>}
      </Pressable>
      {status === 'done' && <Text style={styles.statusText}>Saved.</Text>}
      {status === 'error' && <Text style={styles.statusTextError}>Export failed — try again.</Text>}

      <SectionDivider label="Animated export" />
      <Text style={styles.comingSoon}>
        Video export isn't available yet in this build. The web reference used the browser's Canvas2D
        MediaRecorder API, which has no equivalent for SVG-based rendering — a native frame recorder would
        need to be built separately.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
  },
  multList: {
    gap: 4,
    marginBottom: 12,
  },
  multRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  multRowActive: {
    backgroundColor: C.accentMuted,
    borderColor: C.accent,
  },
  multLabel: {
    color: C.text,
    fontSize: 12,
  },
  multDims: {
    color: C.textMuted,
    fontSize: 12,
  },
  exportBtn: {
    padding: 12,
    borderRadius: 9,
    backgroundColor: C.accent,
    alignItems: 'center',
    marginBottom: 16,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 11,
    color: C.textSub,
    marginTop: -10,
    marginBottom: 12,
  },
  statusTextError: {
    fontSize: 11,
    color: '#FF6B6B',
    marginTop: -10,
    marginBottom: 12,
  },
  comingSoon: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 18,
  },
});
