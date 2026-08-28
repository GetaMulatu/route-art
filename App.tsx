import { StyleSheet, View } from 'react-native';
import { EditorScreen } from './src/editor/EditorScreen';

export default function App() {
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
