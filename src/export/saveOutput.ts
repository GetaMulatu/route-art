import { Platform } from 'react-native';

export type ExportExt = 'png' | 'jpg' | 'webp';

const MIME: Record<ExportExt, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};

function downloadOnWeb(bytes: Uint8Array, mime: string, filename: string) {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function saveToPhotos(bytes: Uint8Array, filename: string) {
  // Dynamic imports: both touch native modules with no web implementation
  // that throw at *import* time, so they must never be statically imported
  // on a file that's bundled for web.
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.cache, filename);
  file.write(bytes);
  const MediaLibrary = await import('expo-media-library');
  const { status } = await MediaLibrary.requestPermissionsAsync({ writeOnly: true });
  if (status !== 'granted') {
    throw new Error('Photo library permission denied');
  }
  await MediaLibrary.Asset.create(file.uri);
}

export async function saveOutput(bytes: Uint8Array, ext: ExportExt, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    downloadOnWeb(bytes, MIME[ext], filename);
  } else {
    await saveToPhotos(bytes, filename);
  }
}
