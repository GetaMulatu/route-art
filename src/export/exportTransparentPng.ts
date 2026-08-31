import { RefObject } from 'react';
import { Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { ACTIVITIES } from '../data/activities';
import { Scene, RouteObject } from '../scene/types';
import { base64ToBytes } from './base64';
import { renderGlowLayer } from './renderGlowLayer';
import { saveOutput } from './saveOutput';

// react-native-view-shot's web backend calls html2canvas without
// `backgroundColor: null`, so it always fills opaque white regardless of the
// DOM's actual transparency, and the wrapper doesn't expose a way to
// override that. We bypass it on web and call html2canvas directly.
//
// html2canvas also silently drops the route's SVG glow filter (verified
// visually), so the glow is rendered separately (real browser SVG
// rendering, not html2canvas) and composited underneath.
async function captureWebTransparentPng(
  node: HTMLElement,
  scene: Scene,
  timeS: number,
  width: number,
  height: number
): Promise<Uint8Array> {
  const html2canvas = (await import('html2canvas')).default;
  const rendered = await html2canvas(node, { useCORS: true, backgroundColor: null });

  const composite = document.createElement('canvas');
  composite.width = width;
  composite.height = height;
  const ctx = composite.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2d context');

  const routeObj = scene.objects.find((o): o is RouteObject => o.type === 'route' && o.visible);
  if (routeObj) {
    const activity = ACTIVITIES.find((a) => a.id === scene.activityId) || ACTIVITIES[0];
    const scale = width / scene.canvasW;
    const glow = await renderGlowLayer(routeObj, activity, timeS, scene.canvasW, scene.canvasH, scale);
    if (glow) ctx.drawImage(glow, 0, 0);
  }

  ctx.drawImage(rendered, 0, 0, width, height);
  const dataUrl = composite.toDataURL('image/png');
  return base64ToBytes(dataUrl.split(',')[1]);
}

export async function exportTransparentPng(
  canvasRef: RefObject<View | null>,
  scene: Scene,
  timeS: number,
  width: number,
  height: number
): Promise<void> {
  const node = canvasRef.current;
  if (!node) throw new Error('Canvas not ready');
  const filename = `route-art-${Date.now()}.png`;

  if (Platform.OS === 'web') {
    const bytes = await captureWebTransparentPng(node as unknown as HTMLElement, scene, timeS, width, height);
    await saveOutput(bytes, 'png', filename);
  } else {
    const base64 = await captureRef(canvasRef, { format: 'png', quality: 1, result: 'base64', width, height });
    await saveOutput(base64ToBytes(base64), 'png', filename);
  }
}
