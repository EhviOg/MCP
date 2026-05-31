/** Global in-app banner — the guaranteed fallback for the "device full" alert. */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette, Radius, Space } from '@/constants/palette';
import { useStore } from '@/lib/store';

export function BannerHost() {
  const { banner, dismissBanner } = useStore();
  const insets = useSafeAreaInsets();
  if (!banner) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 6 }]}>
      <View style={styles.banner}>
        <Ionicons name="checkmark-circle" size={22} color={Palette.green} />
        <Text style={styles.text} numberOfLines={2}>
          {banner}
        </Text>
        <Pressable onPress={dismissBanner} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={20} color={Palette.textDim} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000, paddingHorizontal: Space.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Palette.surfaceAlt,
    borderWidth: 1,
    borderColor: Palette.green,
    borderRadius: Radius.md,
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
    width: '100%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: { color: Palette.text, fontSize: 15, fontWeight: '600', flex: 1 },
  close: { padding: 2 },
});
