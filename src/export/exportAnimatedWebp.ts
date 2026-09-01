import { RefObject } from 'react';
import { View } from 'react-native';
import { Scene } from '../scene/types';
import { base64ToBytes } from './base64';
import { renderWebOverlayCanvas } from './exportTransparentPng';
import { saveOutput } from './saveOutput';
import { muxAnimatedWebp } from './webpMux';

export interface AnimatedWebpOptions {
  fps: number;
  onProgress?: (frac: number) => void;
}

// Drives the real timeS state frame-by-frame (so the live SVG/View renderer
// draws each instant exactly as the editor would), captures each frame the
// same way exportTransparentPng does, encodes it to WebP via the browser's
// own canvas encoder (alpha-safe, no Skia/wasm needed), then stitches the
// per-frame WebP images into one animated file with the hand-rolled muxer —
// nothing else produces a multi-frame animated WebP.
export async function exportAnimatedWebp(
  canvasRef: RefObject<View | null>,
  scene: Scene,
  width: number,
  height: number,
  setTimeS: (t: number) => void,
  opts: AnimatedWebpOptions
): Promise<void> {
  const node = canvasRef.current as unknown as HTMLElement | null;
  if (!node) throw new Error('Canvas not ready');

  const { fps, onProgress } = opts;
  const frameCount = Math.max(1, Math.ceil(scene.duration * fps));
  const frameDurationMs = Math.round(1000 / fps);
  const frames: { data: Uint8Array; durationMs: number }[] = [];

  for (let i = 0; i < frameCount; i++) {
    const t = Math.min(i / fps, scene.duration);
    setTimeS(t);
    // Two RAFs: one for React to commit the new timeS, one for the
    // resulting paint to actually land before html2canvas captures it.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const canvas = await renderWebOverlayCanvas(node, scene, t, width, height);
    const dataUrl = canvas.toDataURL('image/webp', 0.85);
    frames.push({ data: base64ToBytes(dataUrl.split(',')[1]), durationMs: frameDurationMs });

    onProgress?.((i + 1) / frameCount);
    // Yield to the event loop periodically so the tab stays responsive
    // across what can be 100+ synchronous frame renders.
    if (i % 5 === 4) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const muxed = muxAnimatedWebp(frames, width, height, { loopCount: 0 });
  await saveOutput(muxed, 'webp', `route-art-${Date.now()}.webp`);
}
