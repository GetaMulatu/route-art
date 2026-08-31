import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SceneBackground } from '../scene/types';

function VideoBackground({ uri, timeS }: { uri: string; timeS: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
  });

  // The video never plays on its own — its position is driven entirely by
  // timeS, so both live playback (the RAF loop in EditorScreen) and manual
  // timeline scrubbing move it in lockstep with the rest of the animation.
  useEffect(() => {
    player.currentTime = player.duration > 0 ? Math.min(timeS, player.duration) : timeS;
  }, [player, timeS]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}

export function BackgroundLayer({ background, timeS }: { background: SceneBackground; timeS: number }) {
  if (background.type === 'image') {
    return <Image source={{ uri: background.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />;
  }
  return <VideoBackground uri={background.uri} timeS={timeS} />;
}
