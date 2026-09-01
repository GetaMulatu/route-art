import { RefObject } from 'react';
import { View } from 'react-native';
import { Scene } from '../scene/types';
import { base64ToBytes } from './base64';
import { renderWebOverlayCanvas } from './exportTransparentPng';
import { saveOutput } from './saveOutput';

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
) {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  ctx.drawImage(source, (dstW - drawW) / 2, (dstH - drawH) / 2, drawW, drawH);
}

// Snapshots the background *before* touching the DOM: for a video, its
// element only exists while the background layer is mounted, so this must
// happen before hiding it to capture the overlay separately.
async function snapshotBackground(
  node: HTMLElement,
  background: Scene['background'],
  width: number,
  height: number
): Promise<HTMLCanvasElement | null> {
  if (!background) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (background.type === 'video') {
    const video = node.querySelector('video');
    if (!video || video.videoWidth === 0) return null;
    drawCover(ctx, video, video.videoWidth, video.videoHeight, width, height);
    return canvas;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = background.uri;
  await img.decode();
  drawCover(ctx, img, img.naturalWidth, img.naturalHeight, width, height);
  return canvas;
}

export async function exportFlattenedJpeg(
  canvasRef: RefObject<View | null>,
  scene: Scene,
  timeS: number,
  width: number,
  height: number,
  quality: number
): Promise<void> {
  const node = canvasRef.current as unknown as HTMLElement | null;
  if (!node) throw new Error('Canvas not ready');
  if (!scene.background) throw new Error('No background set');

  const bgCanvas = await snapshotBackground(node, scene.background, width, height);

  const bgLayerEl = node.querySelector<HTMLElement>('[data-testid="bg-layer"]');
  const prevDisplay = bgLayerEl?.style.display ?? '';
  try {
    if (bgLayerEl) bgLayerEl.style.display = 'none';
    // Two RAFs: one for the browser to process the style change, one for
    // the resulting paint to actually land before html2canvas runs.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const overlayCanvas = await renderWebOverlayCanvas(node, scene, timeS, width, height);

    const composite = document.createElement('canvas');
    composite.width = width;
    composite.height = height;
    const ctx = composite.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');

    if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0);
    ctx.drawImage(overlayCanvas, 0, 0);

    const dataUrl = composite.toDataURL('image/jpeg', quality);
    const bytes = base64ToBytes(dataUrl.split(',')[1]);
    await saveOutput(bytes, 'jpg', `route-art-${Date.now()}.jpg`);
  } finally {
    if (bgLayerEl) bgLayerEl.style.display = prevDisplay;
  }
}
