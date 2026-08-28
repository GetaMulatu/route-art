import { Text, TextStyle } from 'react-native';
import { TextObject } from '../scene/types';

export function TextLayer({ obj, scale }: { obj: TextObject; scale: number }) {
  const fontSize = obj.fontSize * scale;
  return (
    <Text
      style={{
        fontSize,
        fontWeight: String(obj.fontWeight) as TextStyle['fontWeight'],
        color: obj.color,
        letterSpacing: obj.letterSpacing * fontSize,
        textAlign: obj.align,
      }}
    >
      {obj.text}
    </Text>
  );
}
