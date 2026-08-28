import { Dispatch, useRef } from 'react';
import { LayoutChangeEvent, PanResponder, PanResponderGestureState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SceneAction } from '../scene/sceneReducer';
import { Scene, SceneObject, StatsGroupObject } from '../scene/types';
import { C } from './theme';
import { useDragTrack } from './controls/useDragTrack';

const COLOR_MAP: Record<string, string> = {
  route: C.accent,
  statsGroup: '#00D4FF',
  text: '#A8FF3E',
  deco: '#888888',
};

function useLaneDrag(dur: number, startDelay: number, onChange: (delay: number) => void) {
  const widthRef = useRef(0);
  const startDelayRef = useRef(startDelay);
  const durRef = useRef(dur);
  const onChangeRef = useRef(onChange);
  const grantDelayRef = useRef(startDelay);

  startDelayRef.current = startDelay;
  durRef.current = dur;
  onChangeRef.current = onChange;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        grantDelayRef.current = startDelayRef.current;
      },
      onPanResponderMove: (_evt, gestureState: PanResponderGestureState) => {
        const width = widthRef.current;
        if (width <= 0) return;
        const dtFrac = gestureState.dx / width;
        const newDelay = Math.max(0, Math.min(durRef.current - 0.1, grantDelayRef.current + dtFrac * durRef.current));
        onChangeRef.current(Math.round(newDelay * 10) / 10);
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
  };

  return { panHandlers: responder.panHandlers, onLayout };
}

function Lane({ obj, dur, dispatch }: { obj: SceneObject; dur: number; dispatch: Dispatch<SceneAction> }) {
  const a = obj.anim!;
  const delay = a.delay || 0;
  const animDur =
    obj.type === 'statsGroup' && obj.stats.length
      ? Math.max(...obj.stats.map((s) => (s.anim?.delay || 0) + (s.anim?.duration || 1))) - delay
      : a.duration || 1;
  const startPct = (delay / dur) * 100;
  const widthPct = Math.min(100 - startPct, (animDur / dur) * 100);
  const color = COLOR_MAP[obj.type] || '#888888';

  const handleChange = (newDelay: number) => {
    const delta = Math.round((newDelay - delay) * 10) / 10;
    const patch: Record<string, unknown> = { anim: { ...a, delay: newDelay } };
    if (obj.type === 'statsGroup') {
      patch.stats = (obj as StatsGroupObject).stats.map((s) => ({
        ...s,
        anim: s.anim ? { ...s.anim, delay: Math.max(0, Math.round(((s.anim.delay || 0) + delta) * 10) / 10) } : s.anim,
      }));
    }
    dispatch({ type: 'UPDATE_OBJ', id: obj.id, patch });
  };

  const { panHandlers, onLayout } = useLaneDrag(dur, delay, handleChange);

  return (
    <View style={styles.laneRow}>
      <Text style={styles.laneLabel} numberOfLines={1}>{obj.label || obj.id}</Text>
      <View style={styles.laneTrack} onLayout={onLayout}>
        <View
          {...panHandlers}
          style={[styles.laneBar, { left: `${startPct}%`, width: `${Math.max(widthPct, 1)}%`, backgroundColor: color }]}
        >
          <Text style={styles.laneBarText}>{delay.toFixed(1)}s</Text>
        </View>
      </View>
    </View>
  );
}

export function Timeline({
  scene,
  timeS,
  setTimeS,
  playing,
  setPlaying,
  dispatch,
}: {
  scene: Scene;
  timeS: number;
  setTimeS: (t: number | ((prev: number) => number)) => void;
  playing: boolean;
  setPlaying: (p: boolean | ((prev: boolean) => boolean)) => void;
  dispatch: Dispatch<SceneAction>;
}) {
  const dur = scene.duration;

  const { containerRef: scrubRef, panHandlers: scrubHandlers, onLayout: scrubLayout } = useDragTrack((f) => {
    setTimeS(f * dur);
  });

  const { containerRef: durTrackRef, panHandlers: durHandlers, onLayout: durLayout } = useDragTrack((f) => {
    const v = Math.round((1 + f * 14) * 2) / 2;
    dispatch({ type: 'SET_DURATION', v });
    setTimeS((t) => Math.min(t, v));
  });
  const durFrac = (dur - 1) / 14;

  const objects = scene.objects.filter((o) => o.anim && o.anim.type !== 'none' && o.anim.type !== 'breathing');

  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        <Pressable onPress={() => setTimeS(0)} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>↺</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (!playing && timeS >= dur) setTimeS(0);
            setPlaying((p) => !p);
          }}
          style={styles.playBtn}
        >
          <Text style={styles.playBtnText}>{playing ? '⏸ Pause' : '▶ Play'}</Text>
        </Pressable>
        <Text style={styles.timeText}>
          {timeS.toFixed(2)}s / {dur.toFixed(1)}s
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.durationLabel}>DURATION</Text>
        <View ref={durTrackRef} onLayout={durLayout} {...durHandlers} style={styles.durTrack} hitSlop={{ top: 10, bottom: 10 }}>
          <View style={[styles.durFill, { width: `${durFrac * 100}%` }]} />
          <View style={[styles.durThumb, { left: `${durFrac * 100}%` }]} />
        </View>
        <Text style={styles.durValue}>{dur.toFixed(1)}s</Text>
      </View>

      <View ref={scrubRef} onLayout={scrubLayout} {...scrubHandlers} style={styles.scrubTrack} hitSlop={{ top: 10, bottom: 10 }}>
        <View style={[styles.scrubFill, { width: `${(timeS / dur) * 100}%` }]} />
        <View style={[styles.scrubThumb, { left: `${(timeS / dur) * 100}%` }]} />
      </View>

      <View style={styles.lanes}>
        {objects.map((o) => (
          <Lane key={o.id} obj={o} dur={dur} dispatch={dispatch} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0D0D0D',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  iconBtnText: {
    color: C.textSub,
    fontSize: 11,
  },
  playBtn: {
    backgroundColor: C.accent,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    color: C.textMuted,
    fontVariant: ['tabular-nums'],
  },
  durationLabel: {
    fontSize: 10,
    color: C.textMuted,
  },
  durTrack: {
    width: 80,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.border,
  },
  durFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  durThumb: {
    position: 'absolute',
    top: -4,
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: C.accent,
  },
  durValue: {
    fontSize: 11,
    color: C.textSub,
    minWidth: 30,
    fontVariant: ['tabular-nums'],
  },
  scrubTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.border,
    marginBottom: 8,
  },
  scrubFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  scrubThumb: {
    position: 'absolute',
    top: -3,
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: C.accent,
  },
  lanes: {
    gap: 3,
  },
  laneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  laneLabel: {
    fontSize: 9,
    color: C.textMuted,
    width: 68,
  },
  laneTrack: {
    flex: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 2,
  },
  laneBar: {
    position: 'absolute',
    top: 2,
    height: 10,
    borderRadius: 2,
    opacity: 0.82,
    justifyContent: 'center',
    paddingLeft: 4,
    overflow: 'hidden',
  },
  laneBarText: {
    fontSize: 8,
    color: 'rgba(0,0,0,0.7)',
    fontWeight: '700',
  },
});
