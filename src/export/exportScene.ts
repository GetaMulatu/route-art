import { RefObject } from 'react';
import { Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

function downloadOnWeb(dataUri: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function saveToPhotos(uri: string) {
  // Dynamic import: expo-media-library's Asset API touches a native module
  // that has no web implementation and throws at *import* time, so this
  // must never be statically imported on a file that's bundled for web.
  const MediaLibrary = await import('expo-media-library');
  const { status } = await MediaLibrary.requestPermissionsAsync({ writeOnly: true });
  if (status !== 'granted') {
    throw new Error('Photo library permission denied');
  }
  await MediaLibrary.Asset.create(uri);
}

export async function exportScenePng(canvasRef: RefObject<View | null>, width: number, height: number): Promise<void> {
  if (!canvasRef.current) throw new Error('Canvas not ready');

  if (Platform.OS === 'web') {
    const dataUri = await captureRef(canvasRef, { format: 'png', quality: 1, result: 'data-uri', width, height });
    downloadOnWeb(dataUri, `route-art-${Date.now()}.png`);
  } else {
    const uri = await captureRef(canvasRef, { format: 'png', quality: 1, result: 'tmpfile', width, height });
    await saveToPhotos(uri);
  }
}
