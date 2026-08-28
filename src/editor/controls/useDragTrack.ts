import { useRef } from 'react';
import { GestureResponderEvent, PanResponder, View } from 'react-native';

export function useDragTrack(onFrac: (frac: number) => void) {
  const containerRef = useRef<View>(null);
  const layoutRef = useRef({ x: 0, width: 0 });
  // The PanResponder below is created once via useRef and never rebuilt, so
  // its handlers permanently close over whatever `onFrac` was on the first
  // render. Routing through a ref that's reassigned every render keeps drags
  // reading the current callback (and whatever it closes over) instead of a
  // stale one from mount time.
  const onFracRef = useRef(onFrac);
  onFracRef.current = onFrac;

  const measure = () => {
    containerRef.current?.measureInWindow((x, _y, width) => {
      layoutRef.current = { x, width };
    });
  };

  const handle = (pageX: number) => {
    const { x, width } = layoutRef.current;
    if (width <= 0) return;
    const frac = Math.max(0, Math.min(1, (pageX - x) / width));
    onFracRef.current(frac);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        measure();
        handle(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => handle(evt.nativeEvent.pageX),
    })
  ).current;

  return { containerRef, panHandlers: panResponder.panHandlers, onLayout: measure };
}
