import { Dispatch, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ACTIVITIES } from '../data/activities';
import { C } from '../editor/theme';
import { useObjectDrag } from '../editor/controls/useObjectDrag';
import { getAnimValue } from '../scene/animation';
import { SceneAction } from '../scene/sceneReducer';
import { RouteObject, Scene, SceneObject } from '../scene/types';
import { BackgroundLayer } from './BackgroundLayer';
import { DecoLayer } from './DecoLayer';
import { RouteLayer } from './RouteLayer';
import { StatsGroupLayer } from './StatsGroupLayer';
import { TextLayer } from './TextLayer';

function ObjectWrapper({
  obj,
  timeS,
  scale,
  canvasW,
  canvasH,
  dispatch,
  selected,
  allObjects,
  children,
}: {
  obj: SceneObject;
  timeS: number;
  scale: number;
  canvasW: number;
  canvasH: number;
  dispatch: Dispatch<SceneAction>;
  selected: boolean;
  allObjects: SceneObject[];
  children: React.ReactNode;
}) {
  const av = getAnimValue(obj.anim, timeS, canvasW, canvasH);
  const alpha = (obj.opacity ?? 1) * (av.alpha ?? 1);
  const offsetX = av.offsetX ?? 0;
  const offsetY = av.offsetY ?? 0;
  const objScale = av.scale ?? 1;
  const rotate = av.rotate ?? 0;

  const transforms: ({ scale: number } | { rotate: string })[] = [];
  if (objScale !== 1) transforms.push({ scale: objScale });
  if (rotate !== 0) transforms.push({ rotate: `${rotate}deg` });

  const isRoute = obj.type === 'route';
  const { panHandlers } = useObjectDrag({
    startX: isRoute ? (obj as RouteObject).routeOffsetX : obj.x,
    startY: isRoute ? (obj as RouteObject).routeOffsetY : obj.y,
    scale,
    onSelect: () => dispatch({ type: 'SELECT', id: obj.id }),
    onChange: (x, y) => {
      if (isRoute) {
        dispatch({ type: 'UPDATE_OBJ', id: obj.id, patch: { routeOffsetX: x, routeOffsetY: y } });
        return;
      }
      if (obj.groupId) {
        const dx = x - obj.x;
        const dy = y - obj.y;
        allObjects
          .filter((o) => o.groupId === obj.groupId)
          .forEach((o) => dispatch({ type: 'UPDATE_OBJ', id: o.id, patch: { x: o.x + dx, y: o.y + dy } }));
        return;
      }
      dispatch({ type: 'UPDATE_OBJ', id: obj.id, patch: { x, y } });
    },
    // The route's hit area covers the entire canvas (its full-bleed SVG),
    // not just the drawn stroke, so a plain tap on "empty" background would
    // otherwise steal selection instead of clearing it.
    selectImmediately: !isRoute,
    onTap: isRoute ? () => dispatch({ type: 'SELECT', id: null }) : undefined,
  });

  return (
    <View
      {...panHandlers}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{
        position: 'absolute',
        left: obj.x * scale + offsetX * scale,
        top: obj.y * scale + offsetY * scale,
        opacity: Math.max(0, Math.min(1, alpha)),
        transform: transforms.length ? transforms : undefined,
        borderWidth: selected ? 1.5 : 0,
        borderColor: C.accent,
        borderStyle: 'dashed',
        // @ts-expect-error web-only CSS prop: without it, dragging text/stat
        // objects starts a native text-selection drag instead of moving them.
        userSelect: 'none',
      }}
    >
      {children}
    </View>
  );
}

export function SceneCanvas({
  scene,
  timeS,
  scale,
  dispatch,
}: {
  scene: Scene;
  timeS: number;
  scale: number;
  dispatch: Dispatch<SceneAction>;
}) {
  const activity = useMemo(() => ACTIVITIES.find((a) => a.id === scene.activityId) || ACTIVITIES[0], [scene.activityId]);
  const sorted = useMemo(() => [...scene.objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)), [scene.objects]);

  return (
    <View style={{ width: scene.canvasW * scale, height: scene.canvasH * scale, overflow: 'hidden' }}>
      {scene.background && (
        // testID -> data-testid on web: the flattened-JPEG export path
        // toggles this node's DOM visibility directly to capture the
        // overlay alone, without coordinating a React re-render.
        <View testID="bg-layer" style={StyleSheet.absoluteFill}>
          <BackgroundLayer background={scene.background} timeS={timeS} />
        </View>
      )}
      <Pressable
        onPress={() => dispatch({ type: 'SELECT', id: null })}
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
      />
      {sorted.map((obj) => {
        if (!obj.visible) return null;
        return (
          <ObjectWrapper
            key={obj.id}
            obj={obj}
            timeS={timeS}
            scale={scale}
            canvasW={scene.canvasW}
            canvasH={scene.canvasH}
            dispatch={dispatch}
            selected={obj.id === scene.selectedId}
            allObjects={scene.objects}
          >
            {obj.type === 'route' && (
              <RouteLayer obj={obj} activity={activity} timeS={timeS} canvasW={scene.canvasW} canvasH={scene.canvasH} scale={scale} />
            )}
            {obj.type === 'statsGroup' && (
              <StatsGroupLayer obj={obj} activity={activity} timeS={timeS} canvasH={scene.canvasH} scale={scale} />
            )}
            {obj.type === 'text' && <TextLayer obj={obj} scale={scale} />}
            {obj.type === 'deco' && <DecoLayer obj={obj} scale={scale} />}
          </ObjectWrapper>
        );
      })}
    </View>
  );
}
