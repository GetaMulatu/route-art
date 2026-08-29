import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_900Black, useFonts } from '@expo-google-fonts/inter';
import { StyleSheet, View } from 'react-native';
import { EditorScreen } from './src/editor/EditorScreen';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_900Black });
  if (!fontsLoaded && !fontError) return null;

  return (
    <View style={styles.container}>
      <EditorScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
