import { useRef } from 'react';
import { GestureResponderEvent, PanResponder, View } from 'react-native';

export function usePan2D(onFrac: (fracX: number, fracY: number) => void) {
  const containerRef = useRef<View>(null);
  const layoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const onFracRef = useRef(onFrac);
  onFracRef.current = onFrac;

  const measure = () => {
    containerRef.current?.measureInWindow((x, y, width, height) => {
      layoutRef.current = { x, y, width, height };
    });
  };

  const handle = (pageX: number, pageY: number) => {
    const { x, y, width, height } = layoutRef.current;
    if (width <= 0 || height <= 0) return;
    const fracX = Math.max(0, Math.min(1, (pageX - x) / width));
    const fracY = Math.max(0, Math.min(1, (pageY - y) / height));
    onFracRef.current(fracX, fracY);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        measure();
        handle(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => handle(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
    })
  ).current;

  return { containerRef, panHandlers: panResponder.panHandlers, onLayout: measure };
}
