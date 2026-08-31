import { RefObject, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { exportFlattenedJpeg } from '../../export/exportFlattenedJpeg';
import { exportTransparentPng } from '../../export/exportTransparentPng';
import { Scene } from '../../scene/types';
import { Label, SectionDivider } from '../controls/Basics';
import { Slider } from '../controls/Slider';
import { C } from '../theme';

const MULTIPLIERS = [
  { m: 1, label: 'Standard' },
  { m: 2, label: 'Retina' },
  { m: 3, label: 'Print' },
];

type Status = 'idle' | 'exporting' | 'done' | 'error';

function StatusText({ status }: { status: Status }) {
  if (status === 'done') return <Text style={styles.statusText}>Saved.</Text>;
  if (status === 'error') return <Text style={styles.statusTextError}>Export failed — try again.</Text>;
  return null;
}

function FlattenedJpegExport({ scene, canvasRef, timeS }: { scene: Scene; canvasRef: RefObject<View | null>; timeS: number }) {
  const [mult, setMult] = useState(2);
  const [quality, setQuality] = useState(0.92);
  const [status, setStatus] = useState<Status>('idle');

  const handleExport = async () => {
    if (status === 'exporting') return;
    setStatus('exporting');
    try {
      await exportFlattenedJpeg(canvasRef, scene, timeS, scene.canvasW * mult, scene.canvasH * mult, quality);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (e) {
      console.error('Export failed:', e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <>
      <SectionDivider label="Export JPEG" />
      <Text style={styles.hint}>
        A background photo/video is set, so export is a single flattened frame at the current timeline position —
        scrub the timeline to pick the frame.
      </Text>
      <Label>Resolution</Label>
      <View style={styles.multList}>
        {MULTIPLIERS.map(({ m, label }) => (
          <Pressable key={m} onPress={() => setMult(m)} style={[styles.multRow, mult === m && styles.multRowActive]}>
            <Text style={styles.multLabel}>×{m} {label}</Text>
            <Text style={styles.multDims}>{scene.canvasW * m}×{scene.canvasH * m}</Text>
          </Pressable>
        ))}
      </View>
      <Slider label="Quality" value={quality} min={0.5} max={1} step={0.01} onChange={setQuality} format={(v) => `${Math.round(v * 100)}%`} />
      <Pressable onPress={handleExport} style={styles.exportBtn} disabled={status === 'exporting'}>
        {status === 'exporting' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.exportBtnText}>↓ Download JPEG</Text>}
      </Pressable>
      <StatusText status={status} />
    </>
  );
}

function TransparentExports({ scene, canvasRef, timeS }: { scene: Scene; canvasRef: RefObject<View | null>; timeS: number }) {
  const [mult, setMult] = useState(2);
  const [status, setStatus] = useState<Status>('idle');

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
    <>
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
      <StatusText status={status} />

      <SectionDivider label="Animated export" />
      <Text style={styles.comingSoon}>Transparent animated WebP export is coming next.</Text>
    </>
  );
}

export function ExportPanel({
  scene,
  canvasRef,
  timeS,
}: {
  scene: Scene;
  canvasRef: RefObject<View | null>;
  timeS: number;
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {scene.background ? (
        <FlattenedJpegExport scene={scene} canvasRef={canvasRef} timeS={timeS} />
      ) : (
        <TransparentExports scene={scene} canvasRef={canvasRef} timeS={timeS} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
  },
  hint: {
    fontSize: 11,
    color: C.textMuted,
    lineHeight: 16,
    marginBottom: 12,
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
