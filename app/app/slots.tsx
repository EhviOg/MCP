import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SlotGrid } from '@/components/SlotGrid';
import { BigButton, Card, SectionTitle, StatTile } from '@/components/ui-kit';
import { TOTAL_SLOTS } from '@/constants/config';
import { Palette, Space } from '@/constants/palette';
import { useStore } from '@/lib/store';
import type { Slot } from '@/lib/types';

export default function SlotsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStore();

  const occupied = state.slots.filter((s) => s.status === 'occupied').length;
  const ready = state.slots.filter(
    (s) => s.ticketId && state.tickets[s.ticketId]?.status === 'ready',
  ).length;

  const onSlotPress = (slot: Slot) => {
    if (slot.status === 'occupied') {
      router.push({ pathname: '/slot-detail', params: { slotId: slot.id } });
    } else {
      // Empty slot — jump straight to intake.
      router.push('/add-device');
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: Palette.bg }}
      contentContainerStyle={{ padding: Space.lg, paddingBottom: insets.bottom + Space.xxl, gap: Space.lg }}>
      <View style={styles.tileRow}>
        <StatTile label="Free" value={`${TOTAL_SLOTS - occupied}`} icon="ellipse-outline" />
        <StatTile label="Charging" value={`${occupied - ready}`} icon="battery-charging" color={Palette.orange} />
        <StatTile label="Ready" value={`${ready}`} icon="checkmark-circle" color={Palette.green} />
      </View>

      <Card>
        <SectionTitle>All slots</SectionTitle>
        <Text style={styles.dim}>Tap a slot to view its device. Tap a free slot to check one in.</Text>
        <View style={{ marginTop: Space.md }}>
          <SlotGrid cellSize={15} gap={4} onSlotPress={onSlotPress} />
        </View>
      </Card>

      <BigButton
        title="Pickup (enter ticket)"
        icon="exit"
        onPress={() => router.push('/release')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tileRow: { flexDirection: 'row', gap: Space.md },
  dim: { color: Palette.textDim, fontSize: 14 },
});
