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

export default function TicketScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const ticket = ticketId ? state.tickets[ticketId] : null;

  if (!ticket) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>Ticket not found.</Text>
      </View>
    );
  }

  const statusColor =
    ticket.status === 'ready' ? Palette.green : ticket.status === 'collected' ? Palette.textDim : Palette.orange;

  return (
    <ScrollView
      style={{ backgroundColor: Palette.bg }}
      contentContainerStyle={{ padding: Space.lg, paddingBottom: insets.bottom + Space.xxl, gap: Space.lg }}>
      <Card style={{ alignItems: 'stretch' }}>
        <View style={styles.head}>
          <View>
            <Text style={styles.brand}>SOLAR CHARGING STATION</Text>
            <Text style={styles.ticketNo}>{ticket.ticketNumber}</Text>
          </View>
          <Pill text={ticket.status.toUpperCase()} color={statusColor} />
        </View>

        {/* Expected return — shown prominently */}
        <View style={styles.returnBox}>
          <Ionicons name="time" size={22} color={Palette.accent} />
          <View>
            <Text style={styles.returnLabel}>Expected return time</Text>
            <Text style={styles.returnValue}>{clockTime(ticket.expectedReturnSimMs)}</Text>
          </View>
        </View>

        <Divider />

        <Row label="Slot" value={ticket.slotId} strong />
        <Row label="Device" value={ticket.deviceName} />
        <Row label="Capacity" value={`${ticket.mah.toLocaleString()} mAh`} />
        <Row label="Cable" value={ticket.cableType} />
        <Row label="Tier" value={ticket.tierLabel} />
        <Row label="Charge time" value={durationFromMins(ticket.chargeTimeMins)} />
        <Divider />
        <Row label="Amount paid" value={naira(ticket.amountReceived)} />
        <Row label="Quoted" value={naira(ticket.amountQuoted)} />
        {ticket.amountReceived > ticket.amountQuoted ? (
          <Row label="Change given" value={naira(ticket.amountReceived - ticket.amountQuoted)} />
        ) : null}
        <Divider />
        <Row label="Dropped off" value={clockTime(ticket.dropOffSimMs)} />
        <Row label="Operator" value={ticket.operatorInitials} />

        {ticket.photoUri ? (
          <Image source={{ uri: ticket.photoUri }} style={styles.photo} contentFit="cover" />
        ) : null}
      </Card>

      {ticket.status !== 'collected' ? (
        <BigButton
          title="Pickup / Release"
          icon="exit"
          variant="secondary"
          onPress={() => router.push({ pathname: '/release', params: { ticketId: ticket.id } })}
        />
      ) : null}
      <BigButton title="Done" icon="home" onPress={() => router.replace('/')} />
    </ScrollView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && { fontSize: 20, fontWeight: '900', color: Palette.accent }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bg },
  dim: { color: Palette.textDim, fontSize: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Space.md },
  brand: { color: Palette.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  ticketNo: { color: Palette.text, fontSize: 28, fontWeight: '900', marginTop: 2 },
  returnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Palette.accent + '1A',
    borderRadius: Radius.md,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Palette.accent + '55',
  },
  returnLabel: { color: Palette.textDim, fontSize: 13, fontWeight: '600' },
  returnValue: { color: Palette.text, fontSize: 22, fontWeight: '900' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  rowLabel: { color: Palette.textDim, fontSize: 15 },
  rowValue: { color: Palette.text, fontSize: 16, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  photo: { width: '100%', height: 180, borderRadius: Radius.md, marginTop: Space.md, backgroundColor: Palette.surfaceAlt },
});
