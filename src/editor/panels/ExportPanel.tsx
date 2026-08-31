import { RefObject, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { exportAnimatedWebp } from '../../export/exportAnimatedWebp';
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

const FPS_OPTIONS = [15, 24, 30];

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

function TransparentExports({
  scene,
  canvasRef,
  timeS,
  setTimeS,
  playing,
  setPlaying,
}: {
  scene: Scene;
  canvasRef: RefObject<View | null>;
  timeS: number;
  setTimeS: (t: number) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
}) {
  const [mult, setMult] = useState(2);
  const [pngStatus, setPngStatus] = useState<Status>('idle');
  const [fps, setFps] = useState(24);
  const [webpStatus, setWebpStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);

  const handlePngExport = async () => {
    if (pngStatus === 'exporting') return;
    setPngStatus('exporting');
    try {
      await exportTransparentPng(canvasRef, scene, timeS, scene.canvasW * mult, scene.canvasH * mult);
      setPngStatus('done');
      setTimeout(() => setPngStatus('idle'), 1500);
    } catch (e) {
      console.error('Export failed:', e);
      setPngStatus('error');
      setTimeout(() => setPngStatus('idle'), 2000);
    }
  };

  const handleWebpExport = async () => {
    if (webpStatus === 'exporting') return;
    const wasPlaying = playing;
    const originalTimeS = timeS;
    setPlaying(false);
    setWebpStatus('exporting');
    setProgress(0);
    try {
      await exportAnimatedWebp(canvasRef, scene, scene.canvasW * mult, scene.canvasH * mult, setTimeS, {
        fps,
        onProgress: setProgress,
      });
      setWebpStatus('done');
      setTimeout(() => setWebpStatus('idle'), 1500);
    } catch (e) {
      console.error('Export failed:', e);
      setWebpStatus('error');
      setTimeout(() => setWebpStatus('idle'), 2000);
    } finally {
      setTimeS(originalTimeS);
      setPlaying(wasPlaying);
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
      <Pressable onPress={handlePngExport} style={styles.exportBtn} disabled={pngStatus === 'exporting'}>
        {pngStatus === 'exporting' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.exportBtnText}>↓ Download PNG</Text>}
      </Pressable>
      <StatusText status={pngStatus} />

      <SectionDivider label="Animated WebP" />
      <Text style={styles.hint}>Transparent, plays natively in browsers — great for layering into other tools (e.g. as a photo/sticker layer in Instagram's editor).</Text>
      <Label>Frame rate</Label>
      <View style={styles.fpsRow}>
        {FPS_OPTIONS.map((f) => (
          <Pressable key={f} onPress={() => setFps(f)} style={[styles.fpsBtn, fps === f && styles.fpsBtnActive]}>
            <Text style={[styles.fpsBtnText, fps === f && styles.fpsBtnTextActive]}>{f} fps</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={handleWebpExport} style={styles.exportBtn} disabled={webpStatus === 'exporting'}>
        {webpStatus === 'exporting' ? (
          <Text style={styles.exportBtnText}>Rendering… {Math.round(progress * 100)}%</Text>
        ) : (
          <Text style={styles.exportBtnText}>↓ Download Animated WebP</Text>
        )}
      </Pressable>
      {webpStatus === 'exporting' && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}
      <StatusText status={webpStatus} />
    </>
  );
}

export function ExportPanel({
  scene,
  canvasRef,
  timeS,
  setTimeS,
  playing,
  setPlaying,
}: {
  scene: Scene;
  canvasRef: RefObject<View | null>;
  timeS: number;
  setTimeS: (t: number) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {scene.background ? (
        <FlattenedJpegExport scene={scene} canvasRef={canvasRef} timeS={timeS} />
      ) : (
        <TransparentExports scene={scene} canvasRef={canvasRef} timeS={timeS} setTimeS={setTimeS} playing={playing} setPlaying={setPlaying} />
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
  fpsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  fpsBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    alignItems: 'center',
  },
  fpsBtnActive: {
    backgroundColor: C.accentMuted,
    borderColor: C.accent,
  },
  fpsBtnText: {
    color: C.textMuted,
    fontSize: 12,
  },
  fpsBtnTextActive: {
    color: C.text,
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
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    marginTop: -12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.accent,
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
});
