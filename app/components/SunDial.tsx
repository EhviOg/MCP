/** Revolving sun: spins while the system is generating; color reflects battery status. */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export function SunDial({
  size = 96,
  color,
  spinning,
}: {
  size?: number;
  color: string;
  spinning: boolean;
}) {
  const rot = useSharedValue(0);

  useEffect(() => {
    if (spinning) {
      rot.value = withRepeat(
        withTiming(360, { duration: 6000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(rot);
    }
    return () => cancelAnimation(rot);
  }, [spinning, rot]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.halo,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color + '22', borderColor: color + '55' },
        ]}
      />
      <Animated.View style={style}>
        <Ionicons name="sunny" size={size * 0.72} color={color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', borderWidth: 2 },
});
