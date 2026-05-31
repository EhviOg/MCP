import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigButton, Card, Divider, Pill } from '@/components/ui-kit';
import { Palette, Radius, Space } from '@/constants/palette';
import { clockTime, durationFromMins, naira } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function SlotDetailScreen() {
  const { slotId } = useLocalSearchParams<{ slotId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStore();

  const slot = state.slots.find((s) => s.id === slotId);
  const ticket = slot?.ticketId ? state.tickets[slot.ticketId] : null;

  if (!slot || !ticket) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>Slot {slotId} is empty.</Text>
        <BigButton title="Check in a device" icon="add-circle" onPress={() => router.replace('/add-device')} style={{ marginTop: Space.lg }} />
      </View>
    );
  }

  const remainingMs = ticket.expectedReturnSimMs - state.solar.simNowMs;
  const isReady = ticket.status === 'ready';

  return (
    <ScrollView
      style={{ backgroundColor: Palette.bg }}
      contentContainerStyle={{ padding: Space.lg, paddingBottom: insets.bottom + Space.xxl, gap: Space.lg }}>
      <Card>
        <View style={styles.head}>
          <Text style={styles.slotId}>Slot {slot.id}</Text>
          <Pill
            text={isReady ? 'READY' : ticket.status === 'collected' ? 'COLLECTED' : 'CHARGING'}
            color={isReady ? Palette.green : ticket.status === 'collected' ? Palette.textDim : Palette.orange}
          />
        </View>

        <Divider />
        <Row label="Ticket" value={ticket.ticketNumber} />
        <Row label="Device" value={ticket.deviceName} />
        <Row label="Capacity" value={`${ticket.mah.toLocaleString()} mAh`} />
        <Row label="Cable" value={ticket.cableType} />
        <Row label="Tier" value={ticket.tierLabel} />
        <Row label="Amount paid" value={naira(ticket.amountReceived)} />
        <Divider />
        <Row label="Dropped off" value={clockTime(ticket.dropOffSimMs)} />
        <Row label="Expected return" value={clockTime(ticket.expectedReturnSimMs)} />
        <Row
          label="Status"
          value={isReady ? 'Fully charged' : `~${durationFromMins(remainingMs / 60000)} remaining`}
        />

        {ticket.photoUri ? (
          <Image source={{ uri: ticket.photoUri }} style={styles.photo} contentFit="cover" />
        ) : null}
      </Card>

      <View style={styles.progressWrap}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${Math.max(0, Math.min(100, (1 - remainingMs / (ticket.chargeTimeMins * 60000)) * 100))}%`,
              backgroundColor: isReady ? Palette.green : Palette.orange,
            },
          ]}
        />
      </View>

      <BigButton
        title={`Withdraw from ${slot.id}`}
        icon="exit"
        variant="danger"
        onPress={() => router.push({ pathname: '/release', params: { ticketId: ticket.id } })}
      />
      <Text style={styles.note}>
        <Ionicons name="information-circle" size={13} color={Palette.textDim} /> Withdraw goes through the
        release gate — ticket required, with a Lost-ticket path available.
      </Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.xl, backgroundColor: Palette.bg },
  dim: { color: Palette.textDim, fontSize: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotId: { color: Palette.text, fontSize: 26, fontWeight: '900' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: Palette.textDim, fontSize: 15 },
  rowValue: { color: Palette.text, fontSize: 15, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  photo: { width: '100%', height: 180, borderRadius: Radius.md, marginTop: Space.md, backgroundColor: Palette.surfaceAlt },
  progressWrap: { height: 10, borderRadius: 5, backgroundColor: Palette.surfaceAlt, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 5 },
  note: { color: Palette.textDim, fontSize: 12, textAlign: 'center' },
});
