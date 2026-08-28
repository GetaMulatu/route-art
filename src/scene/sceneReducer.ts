import { ACTIVITIES } from '../data/activities';
import { dateLabelFor, PRESETS } from './defaultScene';
import { Scene, SceneObject } from './types';

export type SceneAction =
  | { type: 'SET_ACTIVITY'; id: string }
  | { type: 'SET_CANVAS'; preset: string }
  | { type: 'SET_CUSTOM_CANVAS'; w?: number; h?: number }
  | { type: 'UPDATE_OBJ'; id: string; patch: Record<string, unknown> }
  | { type: 'SELECT'; id: string | null }
  | { type: 'SET_DURATION'; v: number };

export function sceneReducer(state: Scene, action: SceneAction): Scene {
  switch (action.type) {
    case 'SET_ACTIVITY': {
      const act = ACTIVITIES.find((a) => a.id === action.id) || ACTIVITIES[0];
      const newObjs = state.objects.map((o) => {
        if (o.id === 'activity-label' && o.type === 'text') return { ...o, text: act.activityType.toUpperCase() };
        if (o.id === 'date-label' && o.type === 'text') return { ...o, text: dateLabelFor(act.startDate) };
        return o;
      });
      return { ...state, activityId: action.id, objects: newObjs };
    }
    case 'SET_CANVAS': {
      const p = PRESETS.find((p) => p.id === action.preset);
      if (!p) return state;
      return { ...state, canvasPreset: action.preset, canvasW: p.w, canvasH: p.h };
    }
    case 'SET_CUSTOM_CANVAS':
      return { ...state, canvasPreset: 'custom', canvasW: action.w ?? state.canvasW, canvasH: action.h ?? state.canvasH };
    case 'UPDATE_OBJ':
      return { ...state, objects: state.objects.map((o) => (o.id === action.id ? ({ ...o, ...action.patch } as SceneObject) : o)) };
    case 'SELECT':
      return { ...state, selectedId: action.id };
    case 'SET_DURATION': {
      const newDur = action.v;
      const objects = state.objects.map((o) => {
        if (o.type !== 'route' || !o.anim) return o;
        const routeEnd = (o.anim.delay || 0) + (o.anim.duration || 2);
        if (routeEnd <= newDur) return o;
        const newAnimDur = Math.max(0.5, newDur - (o.anim.delay || 0) - 0.5);
        return { ...o, anim: { ...o.anim, duration: Math.round(newAnimDur * 10) / 10 } };
      });
      return { ...state, duration: newDur, objects };
    }
    default:
      return state;
  }
}
