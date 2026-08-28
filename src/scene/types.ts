export type EaseFunc = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'easeOutBack' | 'easeOutElastic' | 'easeOutBounce';

export type AnimType =
  | 'none' | 'draw' | 'countUp'
  | 'fadeIn' | 'fadeOut' | 'fadeInOut'
  | 'scaleIn' | 'pop' | 'pulse' | 'breathing'
  | 'float' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight'
  | 'tumble';

export interface AnimDescriptor {
  type: AnimType;
  delay?: number;
  duration?: number;
  easeFunc?: EaseFunc;
  loop?: boolean;
  reverse?: boolean;
  minS?: number;
  maxS?: number;
  amp?: number;
}

interface SceneObjectBase {
  id: string;
  label: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
  x: number;
  y: number;
  anim?: AnimDescriptor;
}

export interface RouteObject extends SceneObjectBase {
  type: 'route';
  scale: number;
  rotation: number;
  routeScale: number;
  routeOffsetX: number;
  routeOffsetY: number;
  color: string;
  thickness: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showGlow: boolean;
  glowColor: string;
  glowBlur: number;
  glowAlpha: number;
  showGradient: boolean;
  gradColorStart: string;
  gradColor: string;
  showDots: boolean;
  dotStart: boolean;
  dotEnd: boolean;
  showOutline: boolean;
  outlineColor: string;
  outlineWidth: number;
  showMarker?: boolean;
  markerGlow?: boolean;
  markerSize?: number;
}

export interface StatEntry {
  id: string;
  anim?: AnimDescriptor;
}

export interface StatsGroupObject extends SceneObjectBase {
  type: 'statsGroup';
  layout: 'grid' | 'list';
  cols: number;
  color: string;
  labelColor: string;
  valueFontSize: number;
  labelFontSize: number;
  rowGap: number;
  colGap: number;
  lineGap: number;
  imperial: boolean;
  stats: StatEntry[];
}

export interface TextObject extends SceneObjectBase {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  letterSpacing: number;
  align: 'left' | 'center' | 'right';
}

export interface DecoObject extends SceneObjectBase {
  type: 'deco';
  shape: 'ring' | 'circle' | 'line' | 'dot-grid';
  size?: number;
  fillColor?: string;
  color?: string;
  lineWidth?: number;
  spacing?: number;
  count?: number;
}

export type SceneObject = RouteObject | StatsGroupObject | TextObject | DecoObject;

export interface CanvasPresetDef {
  id: string;
  label: string;
  w: number;
  h: number;
  icon: string;
}

export interface Scene {
  canvasW: number;
  canvasH: number;
  canvasPreset: string;
  duration: number;
  bgColor: string | null;
  bgGradient: string | null;
  objects: SceneObject[];
  activityId: string;
  selectedId: string | null;
}
