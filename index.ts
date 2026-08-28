import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { registerRootComponent } from 'expo';

LoadSkiaWeb({
  locateFile: (file: string, prefix: string) => {
    console.log('locateFile called:', file, prefix);
    const url = `http://localhost:8081/${file}`;
    console.log('returning url:', url);
    return url;
  },
}).then(() => {
  console.log('Skia loaded successfully');
  const App = require('./App').default;
  registerRootComponent(App);
}).catch((e: unknown) => {
  console.error('Skia failed to load:', e);
});