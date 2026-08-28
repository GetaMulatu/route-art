import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Activity, addActivity } from './activities';
import { parseGPX } from './gpx';

async function readAssetText(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === 'web') {
    if (asset.file) return await asset.file.text();
    if (asset.uri.startsWith('data:')) {
      const base64 = asset.uri.split(',')[1] ?? '';
      return atob(base64);
    }
    throw new Error('Unable to read picked file on web');
  }
  const FileSystem = await import('expo-file-system/legacy');
  return await FileSystem.readAsStringAsync(asset.uri);
}

export async function importGpxActivity(): Promise<Activity | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  if (!asset.name.toLowerCase().endsWith('.gpx')) {
    throw new Error(`"${asset.name}" isn't a .gpx file`);
  }

  const xmlText = await readAssetText(asset);
  const activity = parseGPX(xmlText, { name: asset.name.replace(/\.gpx$/i, '') });
  addActivity(activity);
  return activity;
}
