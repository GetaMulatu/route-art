import { fmt } from '../data/format';
import { CanvasPresetDef, Scene } from './types';

export const PRESETS: CanvasPresetDef[] = [
  { id: 'story', label: 'Story / Reel', w: 1080, h: 1920, icon: '📱' },
  { id: 'portrait', label: 'Portrait Feed', w: 1080, h: 1350, icon: '🖼' },
  { id: 'square', label: 'Square', w: 1080, h: 1080, icon: '⬜' },
  { id: 'landscape', label: 'Landscape', w: 1920, h: 1080, icon: '🖥' },
  { id: 'custom', label: 'Custom', w: 1080, h: 1920, icon: '✏️' },
];

export function makeDefaultScene(activityId = 'run-loop'): Scene {
  return {
    canvasW: 1080,
    canvasH: 1920,
    canvasPreset: 'story',
    duration: 5.0,
    bgColor: null,
    bgGradient: null,
    activityId,
    selectedId: null,
    objects: [
      {
        id: 'route', type: 'route', label: 'Route',
        visible: true, opacity: 1, zIndex: 10,
        x: 0, y: 0, scale: 1, rotation: 0,
        routeScale: 0.72, routeOffsetX: 0, routeOffsetY: -60,
        color: '#FC4C02', thickness: 5.5, lineStyle: 'solid',
        showGlow: true, glowBlur: 18, glowAlpha: 0.35,
        showGradient: false, gradColorStart: '#FC4C02', gradColor: '#FF6B9D',
        showDots: true, dotStart: true, dotEnd: true,
        showOutline: false, outlineColor: '#000000', outlineWidth: 4,
        anim: { type: 'draw', delay: 0.4, duration: 2.2, easeFunc: 'easeInOut' },
      },
      {
        id: 'stats-group', type: 'statsGroup', label: 'Stats',
        visible: true, opacity: 1, zIndex: 20,
        x: 80, y: 1520,
        layout: 'grid', cols: 2,
        color: '#FFFFFF', labelColor: 'rgba(255,255,255,0.55)',
        valueFontSize: 52, labelFontSize: 20,
        rowGap: 28, colGap: 0, lineGap: 8,
        imperial: false,
        stats: [
          { id: 'distance', anim: { type: 'countUp', delay: 2.8, duration: 1.2, easeFunc: 'easeOut' } },
          { id: 'duration', anim: { type: 'countUp', delay: 2.8, duration: 1.2, easeFunc: 'easeOut' } },
          { id: 'avgPace', anim: { type: 'countUp', delay: 2.8, duration: 1.2, easeFunc: 'easeOut' } },
          { id: 'elevationGain', anim: { type: 'countUp', delay: 2.8, duration: 1.2, easeFunc: 'easeOut' } },
        ],
        anim: { type: 'slideUp', delay: 2.6, duration: 0.6, easeFunc: 'easeOut' },
      },
      {
        id: 'activity-label', type: 'text', label: 'Activity Name',
        visible: true, opacity: 1, zIndex: 25,
        x: 80, y: 130,
        text: 'RUN', fontFamily: 'system-ui', fontSize: 96, fontWeight: 900,
        color: '#FFFFFF', letterSpacing: 0.12, align: 'left',
        anim: { type: 'fadeIn', delay: 0.1, duration: 0.7, easeFunc: 'easeOut' },
      },
      {
        id: 'date-label', type: 'text', label: 'Date',
        visible: true, opacity: 0.5, zIndex: 25,
        x: 80, y: 238,
        text: 'MAR 15, 2024', fontFamily: 'system-ui', fontSize: 22, fontWeight: 600,
        color: '#FFFFFF', letterSpacing: 0.18, align: 'left',
        anim: { type: 'fadeIn', delay: 0.3, duration: 0.6, easeFunc: 'easeOut' },
      },
    ],
  };
}

export const ROUTE_STYLE_PRESETS = [
  { id: 'minimal', label: 'Minimal', color: '#FFFFFF', thickness: 3.5, showGlow: false, showGradient: false, lineStyle: 'solid' as const },
  { id: 'bold', label: 'Bold', color: '#FC4C02', thickness: 7, showGlow: false, showGradient: false, lineStyle: 'solid' as const },
  { id: 'neon', label: 'Neon', color: '#00FFAA', thickness: 4, showGlow: true, glowBlur: 24, glowAlpha: 0.5, showGradient: false, lineStyle: 'solid' as const },
  { id: 'gradient', label: 'Gradient', color: '#FC4C02', thickness: 5, showGlow: true, glowBlur: 12, glowAlpha: 0.25, showGradient: true, gradColor: '#FF6B9D', lineStyle: 'solid' as const },
  { id: 'dashed', label: 'Dashed', color: '#FFFFFF', thickness: 4, showGlow: false, showGradient: false, lineStyle: 'dashed' as const },
  { id: 'cyber', label: 'Cyber', color: '#00D4FF', thickness: 4, showGlow: true, glowBlur: 20, glowAlpha: 0.45, showGradient: true, gradColor: '#7B2FFF', lineStyle: 'solid' as const },
];

export interface AnimationPreset {
  id: string;
  label: string;
  apply: (scene: Scene) => Scene;
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: 'route-first', label: 'Route First',
    apply: (scene) => ({
      ...scene,
      duration: 5.5,
      objects: scene.objects.map((o) => {
        if (o.type === 'route') return { ...o, anim: { type: 'draw' as const, delay: 0.3, duration: 2.5, easeFunc: 'easeInOut' as const } };
        if (o.type === 'statsGroup') return { ...o, anim: { type: 'slideUp' as const, delay: 3.2, duration: 0.5, easeFunc: 'easeOut' as const }, stats: o.stats.map((s) => ({ ...s, anim: { type: 'countUp' as const, delay: 3.2, duration: 1.0, easeFunc: 'easeOut' as const } })) };
        if (o.type === 'text') return { ...o, anim: { type: 'fadeIn' as const, delay: 0.1, duration: 0.6, easeFunc: 'easeOut' as const } };
        if (o.type === 'deco') return { ...o, anim: o.anim ? { ...o.anim, delay: 0 } : o.anim };
        return o;
      }),
    }),
  },
  {
    id: 'cinematic', label: 'Cinematic',
    apply: (scene) => ({
      ...scene,
      duration: 7.0,
      objects: scene.objects.map((o) => {
        if (o.type === 'route') return { ...o, anim: { type: 'draw' as const, delay: 1.2, duration: 3.5, easeFunc: 'easeInOut' as const } };
        if (o.type === 'statsGroup') return { ...o, anim: { type: 'fadeIn' as const, delay: 5.0, duration: 1.2, easeFunc: 'easeOut' as const }, stats: o.stats.map((s) => ({ ...s, anim: { type: 'countUp' as const, delay: 5.0, duration: 1.5, easeFunc: 'easeOut' as const } })) };
        if (o.type === 'text') return { ...o, anim: { type: 'fadeIn' as const, delay: 0.3, duration: 1.2, easeFunc: 'easeOut' as const } };
        if (o.type === 'deco') return { ...o, anim: { type: 'fadeIn' as const, delay: 0, duration: 1.5 } };
        return o;
      }),
    }),
  },
  {
    id: 'energetic', label: 'Energetic',
    apply: (scene) => ({
      ...scene,
      duration: 4.0,
      objects: scene.objects.map((o) => {
        if (o.type === 'route') return { ...o, anim: { type: 'draw' as const, delay: 0.1, duration: 1.5, easeFunc: 'easeIn' as const } };
        if (o.type === 'statsGroup') return { ...o, anim: { type: 'slideUp' as const, delay: 1.8, duration: 0.3, easeFunc: 'easeOutBack' as const }, stats: o.stats.map((s) => ({ ...s, anim: { type: 'countUp' as const, delay: 1.8, duration: 0.7, easeFunc: 'easeOutBounce' as const } })) };
        if (o.type === 'text') return { ...o, anim: { type: 'pop' as const, delay: 0, duration: 0.5, easeFunc: 'easeOutBack' as const } };
        return o;
      }),
    }),
  },
];

export function dateLabelFor(startDate: string): string {
  return fmt.date(startDate).toUpperCase();
}
