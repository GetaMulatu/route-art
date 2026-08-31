import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducer } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { makeDefaultScene } from '../scene/defaultScene';
import { sceneReducer } from '../scene/sceneReducer';
import { RouteObject, StatsGroupObject } from '../scene/types';
import { SceneCanvas } from '../render/SceneCanvas';
import { ActivityPicker } from './ActivityPicker';
import { Timeline } from './Timeline';
import { TabButton } from './controls/Basics';
import { AnimPresetsPanel } from './panels/AnimPresetsPanel';
import { CanvasPanel } from './panels/CanvasPanel';
import { ExportPanel } from './panels/ExportPanel';
import { RoutePanel } from './panels/RoutePanel';
import { StatsPanel } from './panels/StatsPanel';
import { C } from './theme';

const SIDEBAR_W = 288;
const HEADER_H = 50;
const TIMELINE_H = 150;

const TABS = [
  { id: 'route', label: 'Route' },
  { id: 'stats', label: 'Stats' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'anim', label: 'Anim' },
  { id: 'export', label: 'Export' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function EditorScreen() {
  const initScene = useMemo(() => makeDefaultScene('run-loop'), []);
  const [scene, dispatch] = useReducer(sceneReducer, initScene);
  const [timeS, setTimeS] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('route');
  const canvasRef = useRef<View>(null);
  const { width: winW, height: winH } = useWindowDimensions();

  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTRef.current = null;
    const tick = (now: number) => {
      const dt = lastTRef.current != null ? (now - lastTRef.current) / 1000 : 0;
      lastTRef.current = now;
      setTimeS((t) => {
        const next = t + dt;
        if (next >= scene.duration) {
          setPlaying(false);
          return scene.duration;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, scene.duration]);

  const routeObj = scene.objects.find((o) => o.type === 'route') as RouteObject | undefined;
  const statsObj = scene.objects.find((o) => o.type === 'statsGroup') as StatsGroupObject | undefined;

  const previewBoxW = Math.max(120, winW - SIDEBAR_W - 40);
  const previewBoxH = Math.max(120, winH - HEADER_H - TIMELINE_H - 40);
  const aspect = scene.canvasW / scene.canvasH;
  const previewH = Math.min(previewBoxH, previewBoxW / aspect);
  const previewW = previewH * aspect;
  const scale = previewW / scene.canvasW;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>R</Text>
        </View>
        <Text style={styles.title}>Route Art</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>SVG Engine</Text>
        </View>
        <View style={{ flex: 1 }} />
        <ActivityPicker
          activityId={scene.activityId}
          onSelect={(id) => {
            dispatch({ type: 'SET_ACTIVITY', id });
            setTimeS(0);
            setPlaying(false);
          }}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.previewArea}>
          <View style={[styles.canvasFrameOuter, { width: previewW, height: previewH }]}>
            <View ref={canvasRef} collapsable={false} style={[styles.canvasFrame, { width: previewW, height: previewH }]}>
              <SceneCanvas scene={scene} timeS={timeS} scale={scale} dispatch={dispatch} />
            </View>
          </View>
          <Text style={styles.previewCaption}>
            {scene.canvasW}×{scene.canvasH} · {scene.canvasPreset.toUpperCase()}
          </Text>
        </View>

        <View style={styles.sidebar}>
          <View style={styles.tabBar}>
            {TABS.map((t) => (
              <TabButton key={t.id} active={activeTab === t.id} label={t.label} onPress={() => setActiveTab(t.id)} />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            {activeTab === 'route' && <RoutePanel obj={routeObj} dispatch={dispatch} sceneDuration={scene.duration} />}
            {activeTab === 'stats' && <StatsPanel obj={statsObj} dispatch={dispatch} />}
            {activeTab === 'canvas' && <CanvasPanel scene={scene} dispatch={dispatch} />}
            {activeTab === 'anim' && <AnimPresetsPanel scene={scene} dispatch={dispatch} />}
            {activeTab === 'export' && (
              <ExportPanel
                scene={scene}
                canvasRef={canvasRef}
                timeS={timeS}
                setTimeS={setTimeS}
                playing={playing}
                setPlaying={setPlaying}
              />
            )}
          </View>
        </View>
      </View>

      <Timeline scene={scene} timeS={timeS} setTimeS={setTimeS} playing={playing} setPlaying={setPlaying} dispatch={dispatch} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    backgroundColor: '#0D0D0D',
  },
  logo: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    color: C.text,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  badgeText: {
    color: C.textMuted,
    fontSize: 10,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  // Editor-chrome-only backdrop: kept OUTSIDE the ref'd view below so
  // captureRef-based export sees a transparent background, not this fill.
  canvasFrameOuter: {
    backgroundColor: '#141414',
    borderRadius: 8,
    overflow: 'hidden',
  },
  canvasFrame: {
    overflow: 'hidden',
  },
  previewCaption: {
    fontSize: 10,
    color: C.textMuted,
    letterSpacing: 1,
  },
  sidebar: {
    width: SIDEBAR_W,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: C.border,
    backgroundColor: '#0D0D0D',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
});
