import { useMemo } from 'react';
import { View } from 'react-native';
import { ACTIVITIES } from '../data/activities';
import { getAnimValue } from '../scene/animation';
import { Scene, SceneObject } from '../scene/types';
import { DecoLayer } from './DecoLayer';
import { RouteLayer } from './RouteLayer';
import { StatsGroupLayer } from './StatsGroupLayer';
import { TextLayer } from './TextLayer';

function ObjectWrapper({ obj, timeS, scale, children }: { obj: SceneObject; timeS: number; scale: number; children: React.ReactNode }) {
  const av = getAnimValue(obj.anim, timeS);
  const alpha = (obj.opacity ?? 1) * (av.alpha ?? 1);
  const offsetX = av.offsetX ?? 0;
  const offsetY = av.offsetY ?? 0;
  const objScale = av.scale ?? 1;
  const rotate = av.rotate ?? 0;

  const transforms: ({ scale: number } | { rotate: string })[] = [];
  if (objScale !== 1) transforms.push({ scale: objScale });
  if (rotate !== 0) transforms.push({ rotate: `${rotate}deg` });

  return (
    <View
      style={{
        position: 'absolute',
        left: obj.x * scale + offsetX * scale,
        top: obj.y * scale + offsetY * scale,
        opacity: Math.max(0, Math.min(1, alpha)),
        transform: transforms.length ? transforms : undefined,
      }}
    >
      {children}
    </View>
  );
}

export function SceneCanvas({ scene, timeS, scale }: { scene: Scene; timeS: number; scale: number }) {
  const activity = useMemo(() => ACTIVITIES.find((a) => a.id === scene.activityId) || ACTIVITIES[0], [scene.activityId]);
  const sorted = useMemo(() => [...scene.objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)), [scene.objects]);

  return (
    <View style={{ width: scene.canvasW * scale, height: scene.canvasH * scale, overflow: 'hidden' }}>
      {sorted.map((obj) => {
        if (!obj.visible) return null;
        return (
          <ObjectWrapper key={obj.id} obj={obj} timeS={timeS} scale={scale}>
            {obj.type === 'route' && (
              <RouteLayer obj={obj} activity={activity} timeS={timeS} canvasW={scene.canvasW} canvasH={scene.canvasH} scale={scale} />
            )}
            {obj.type === 'statsGroup' && (
              <StatsGroupLayer obj={obj} activity={activity} timeS={timeS} canvasW={scene.canvasW} canvasH={scene.canvasH} scale={scale} />
            )}
            {obj.type === 'text' && <TextLayer obj={obj} scale={scale} />}
            {obj.type === 'deco' && <DecoLayer obj={obj} scale={scale} />}
          </ObjectWrapper>
        );
      })}
    </View>
  );
}
