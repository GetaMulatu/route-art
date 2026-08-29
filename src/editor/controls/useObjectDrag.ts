import { useRef } from 'react';
import { PanResponder, PanResponderGestureState } from 'react-native';

// Free-form delta drag, modeled on Timeline.tsx's useLaneDrag: unlike
// useDragTrack/usePan2D (which clamp to a 0-1 fraction of their own
// container box), this tracks gestureState.dx/dy relative to wherever the
// drag started, so an object can move anywhere on (or off) the canvas.
// A "tap" (no real movement) below this many screen px doesn't count as a drag.
const TAP_SLOP = 3;

export function useObjectDrag(params: {
  startX: number;
  startY: number;
  scale: number;
  onSelect: () => void;
  onChange: (x: number, y: number) => void;
  // When false, onSelect only fires once real dragging starts, and a
  // stationary tap fires onTap instead — for objects (like the route) whose
  // hit area covers more than their visible content, so a plain tap on
  // "empty" space doesn't hijack selection out from under the real target.
  selectImmediately?: boolean;
  onTap?: () => void;
}) {
  const startXRef = useRef(params.startX);
  const startYRef = useRef(params.startY);
  const scaleRef = useRef(params.scale);
  const onSelectRef = useRef(params.onSelect);
  const onChangeRef = useRef(params.onChange);
  const onTapRef = useRef(params.onTap);
  const selectImmediatelyRef = useRef(params.selectImmediately ?? true);
  const grantXRef = useRef(params.startX);
  const grantYRef = useRef(params.startY);
  const movedRef = useRef(false);
  const selectedThisGestureRef = useRef(false);

  startXRef.current = params.startX;
  startYRef.current = params.startY;
  scaleRef.current = params.scale;
  onSelectRef.current = params.onSelect;
  onChangeRef.current = params.onChange;
  onTapRef.current = params.onTap;
  selectImmediatelyRef.current = params.selectImmediately ?? true;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        grantXRef.current = startXRef.current;
        grantYRef.current = startYRef.current;
        movedRef.current = false;
        selectedThisGestureRef.current = false;
        if (selectImmediatelyRef.current) {
          selectedThisGestureRef.current = true;
          onSelectRef.current();
        }
      },
      onPanResponderMove: (_evt, gestureState: PanResponderGestureState) => {
        const scale = scaleRef.current;
        if (scale <= 0) return;
        if (Math.abs(gestureState.dx) > TAP_SLOP || Math.abs(gestureState.dy) > TAP_SLOP) {
          movedRef.current = true;
          if (!selectedThisGestureRef.current) {
            selectedThisGestureRef.current = true;
            onSelectRef.current();
          }
        }
        const dx = gestureState.dx / scale;
        const dy = gestureState.dy / scale;
        onChangeRef.current(grantXRef.current + dx, grantYRef.current + dy);
      },
      onPanResponderRelease: () => {
        if (!movedRef.current && !selectImmediatelyRef.current) {
          onTapRef.current?.();
        }
      },
    })
  ).current;

  return { panHandlers: responder.panHandlers };
}
