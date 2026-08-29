import { Text, TextStyle } from 'react-native';
import { resolveFontFamily } from './fonts';
import { TextObject } from '../scene/types';

export function TextLayer({ obj, scale }: { obj: TextObject; scale: number }) {
  const fontSize = obj.fontSize * scale;
  return (
    <Text
      style={{
        fontSize,
        fontFamily: resolveFontFamily(obj.fontWeight),
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
