/** Concert-seating-style chart of all 100 slots. Used read-only on Home and interactive on Slots. */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ROW_LETTERS, SLOTS_PER_ROW } from '@/constants/config';
import { Palette, Radius, Space } from '@/constants/palette';
import { useStore } from '@/lib/store';
import type { Slot } from '@/lib/types';

function slotColor(slot: Slot, isReady: boolean): { bg: string; border: string } {
  if (slot.status === 'empty') return { bg: Palette.slotFree, border: Palette.slotFreeBorder };
  if (isReady) return { bg: Palette.slotReady, border: Palette.slotReady };
  return { bg: Palette.slotOccupied, border: Palette.slotOccupied };
}

export function SlotGrid({
  cellSize = 15,
  gap = 4,
  onSlotPress,
  showLegend = true,
}: {
  cellSize?: number;
  gap?: number;
  onSlotPress?: (slot: Slot) => void;
  showLegend?: boolean;
}) {
  const { state } = useStore();
  const { slots, tickets } = state;

  return (
    <View>
      <View style={styles.screenBar}>
        <Text style={styles.screenBarText}>CHARGING BUSES · 45W TYPE-C</Text>
      </View>
      <View style={{ gap }}>
        {ROW_LETTERS.map((letter) => (
          <View key={letter} style={[styles.row, { gap }]}>
            <Text style={[styles.rowLabel, { width: 16, lineHeight: cellSize }]}>{letter}</Text>
            {Array.from({ length: SLOTS_PER_ROW }).map((_, i) => {
              const id = `${letter}${(i + 1).toString().padStart(2, '0')}`;
              const slot = slots.find((s) => s.id === id)!;
              const t = slot.ticketId ? tickets[slot.ticketId] : null;
              const isReady = t?.status === 'ready';
              const c = slotColor(slot, isReady);
              const cell = (
                <View
                  style={[
                    styles.cell,
                    { width: cellSize, height: cellSize, borderRadius: Math.max(3, cellSize / 5), backgroundColor: c.bg, borderColor: c.border },
                  ]}
                />
              );
              return onSlotPress ? (
                <Pressable key={id} onPress={() => onSlotPress(slot)} hitSlop={2}>
                  {cell}
                </Pressable>
              ) : (
                <View key={id}>{cell}</View>
              );
            })}
          </View>
        ))}
      </View>

      {showLegend ? (
        <View style={styles.legend}>
          <Legend color={Palette.slotFree} border={Palette.slotFreeBorder} label="Free" />
          <Legend color={Palette.slotOccupied} border={Palette.slotOccupied} label="Charging" />
          <Legend color={Palette.slotReady} border={Palette.slotReady} label="Ready" />
        </View>
      ) : null}
    </View>
  );
}

function Legend({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color, borderColor: border }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenBar: {
    backgroundColor: Palette.surfaceAlt,
    borderRadius: Radius.sm,
    paddingVertical: 4,
    alignItems: 'center',
    marginBottom: Space.md,
  },
  screenBarText: { color: Palette.textFaint, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { color: Palette.textFaint, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  cell: { borderWidth: 1 },
  legend: { flexDirection: 'row', gap: Space.lg, marginTop: Space.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 4, borderWidth: 1 },
  legendText: { color: Palette.textDim, fontSize: 13, fontWeight: '600' },
});
