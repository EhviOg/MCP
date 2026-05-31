import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoCapture } from '@/components/PhotoCapture';
import { BigButton, Card, Divider, Label, Pill, SectionTitle } from '@/components/ui-kit';
import { Palette, Radius, Space } from '@/constants/palette';
import { clockTime, naira } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Ticket } from '@/lib/types';

export default function ReleaseScreen() {
  const params = useLocalSearchParams<{ ticketId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, release } = useStore();

  const [numberInput, setNumberInput] = useState('');
  const [pickedSlotId, setPickedSlotId] = useState<string | null>(null);
  const [lostMode, setLostMode] = useState(false);

  // Lost-ticket checklist
  const [managerApproved, setManagerApproved] = useState(false);
  const [identified, setIdentified] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [lostPhoto, setLostPhoto] = useState<string | null>(null);

  // Resolve the target ticket: explicit param > typed number match > picked slot (lost mode).
  const byParam = params.ticketId ? state.tickets[params.ticketId] : null;
  const byNumber =
    !byParam && numberInput.trim()
      ? Object.values(state.tickets).find(
          (t) =>
            t.status !== 'collected' &&
            t.ticketNumber.toLowerCase() === normalizeTicketNo(numberInput),
        )
      : null;
  const bySlot = pickedSlotId
    ? Object.values(state.tickets).find((t) => t.slotId === pickedSlotId && t.status !== 'collected')
    : null;
  const ticket: Ticket | null = byParam ?? byNumber ?? bySlot ?? null;

  const occupiedTickets = Object.values(state.tickets).filter((t) => t.status !== 'collected');

  const lostChecklistComplete =
    managerApproved && identified && unlocked && ownerName.trim().length > 0 && ownerPhone.trim().length > 0;

  const canRelease = !!ticket && (!lostMode || lostChecklistComplete);

  const onRelease = () => {
    if (!ticket || !canRelease) return;
    release(ticket.id);
    router.replace('/');
  };

  return (
    <ScrollView
      style={{ backgroundColor: Palette.bg }}
      contentContainerStyle={{ padding: Space.lg, paddingBottom: insets.bottom + Space.xxl, gap: Space.lg }}
      keyboardShouldPersistTaps="handled">
      <Card>
        <SectionTitle>Release gate</SectionTitle>
        <Text style={styles.dim}>Every device leaves through here. Verify the ticket, then release.</Text>

        {!byParam ? (
          <>
            <Label style={{ marginTop: Space.md }}>Ticket number</Label>
            <TextInput
              value={numberInput}
              onChangeText={(t) => {
                setNumberInput(t);
                setPickedSlotId(null);
              }}
              placeholder="e.g. T-001"
              placeholderTextColor={Palette.textFaint}
              autoCapitalize="characters"
              style={styles.input}
            />
          </>
        ) : null}

        {/* Verified device */}
        {ticket ? (
          <View style={styles.verified}>
            <View style={styles.verifiedHead}>
              <Ionicons name="checkmark-circle" size={20} color={Palette.green} />
              <Text style={styles.verifiedTitle}>Verified · {ticket.ticketNumber}</Text>
              <Pill
                text={ticket.status === 'ready' ? 'READY' : 'CHARGING'}
                color={ticket.status === 'ready' ? Palette.green : Palette.orange}
              />
            </View>
            <Divider />
            <Detail label="Slot" value={ticket.slotId} />
            <Detail label="Device" value={ticket.deviceName} />
            <Detail label="Capacity" value={`${ticket.mah.toLocaleString()} mAh`} />
            <Detail label="Cable" value={ticket.cableType} />
            <Detail label="Dropped off" value={clockTime(ticket.dropOffSimMs)} />
            <Detail label="Amount paid" value={naira(ticket.amountReceived)} />
            {ticket.status !== 'ready' ? (
              <View style={styles.partialNote}>
                <Ionicons name="alert-circle" size={16} color={Palette.orange} />
                <Text style={styles.partialText}>Not fully charged — this is a partial release.</Text>
              </View>
            ) : null}
          </View>
        ) : !lostMode && !byParam ? (
          <Text style={styles.dim}>Enter the ticket number to find the device.</Text>
        ) : null}
      </Card>

      {/* Lost ticket toggle — ALWAYS available */}
      <Card>
        <Pressable style={styles.lostToggle} onPress={() => setLostMode((v) => !v)}>
          <Ionicons name={lostMode ? 'chevron-down' : 'help-circle'} size={20} color={Palette.warning} />
          <Text style={styles.lostToggleText}>Lost ticket?</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name={lostMode ? 'remove' : 'add'} size={20} color={Palette.textDim} />
        </Pressable>

        {lostMode ? (
          <View style={{ marginTop: Space.md, gap: Space.sm }}>
            <Text style={styles.dim}>Complete every step before releasing without a ticket.</Text>

            {/* If we still have no target, let the operator pick the occupied slot. */}
            {!ticket ? (
              <View>
                <Label style={{ marginVertical: 6 }}>Identify the slot</Label>
                <View style={styles.slotPick}>
                  {occupiedTickets.length === 0 ? (
                    <Text style={styles.dim}>No occupied slots.</Text>
                  ) : (
                    occupiedTickets.map((t) => (
                      <Pressable
                        key={t.id}
                        onPress={() => setPickedSlotId(t.slotId)}
                        style={[styles.slotChip, pickedSlotId === t.slotId && styles.slotChipActive]}>
                        <Text
                          style={[styles.slotChipText, pickedSlotId === t.slotId && { color: Palette.accentText }]}>
                          {t.slotId}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              </View>
            ) : null}

            <CheckRow label="1 · Manager approval" value={managerApproved} onChange={setManagerApproved} />
            <CheckRow label="2 · Identify brand / model / colour" value={identified} onChange={setIdentified} />
            <CheckRow label="3 · Unlock / identify lock screen" value={unlocked} onChange={setUnlocked} />

            <Label style={{ marginTop: 6 }}>4 · Owner name</Label>
            <TextInput
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="Full name"
              placeholderTextColor={Palette.textFaint}
              style={styles.input}
            />
            <Label>Owner phone</Label>
            <TextInput
              value={ownerPhone}
              onChangeText={setOwnerPhone}
              placeholder="Phone number"
              placeholderTextColor={Palette.textFaint}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <Label style={{ marginTop: 6 }}>5 · Record photo</Label>
            <PhotoCapture photoUri={lostPhoto} onCapture={setLostPhoto} />
          </View>
        ) : null}
      </Card>

      <BigButton
        title={ticket ? `Release ${ticket.slotId}` : 'Release'}
        icon="exit"
        variant="danger"
        onPress={onRelease}
        disabled={!canRelease}
      />
      {lostMode && ticket && !lostChecklistComplete ? (
        <Text style={[styles.dim, { textAlign: 'center' }]}>
          Finish the lost-ticket checklist to enable release.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function normalizeTicketNo(input: string): string {
  const s = input.trim().toLowerCase();
  if (s.startsWith('t-') || s.startsWith('t')) {
    const digits = s.replace(/[^0-9]/g, '');
    if (digits) return `t-${digits.padStart(3, '0')}`;
  }
  return s;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function CheckRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable style={styles.checkRow} onPress={() => onChange(!value)}>
      <Ionicons
        name={value ? 'checkbox' : 'square-outline'}
        size={24}
        color={value ? Palette.green : Palette.textDim}
      />
      <Text style={styles.checkLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: Palette.green, false: Palette.border }}
        thumbColor="#fff"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: { color: Palette.textDim, fontSize: 14 },
  input: {
    backgroundColor: Palette.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    color: Palette.text,
    fontSize: 18,
    paddingHorizontal: Space.md,
    paddingVertical: 14,
    marginTop: 6,
  },
  verified: {
    marginTop: Space.md,
    backgroundColor: Palette.surfaceAlt,
    borderRadius: Radius.md,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Palette.green + '55',
  },
  verifiedHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifiedTitle: { color: Palette.text, fontSize: 16, fontWeight: '800' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailLabel: { color: Palette.textDim, fontSize: 14 },
  detailValue: { color: Palette.text, fontSize: 15, fontWeight: '700' },
  partialNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Space.sm },
  partialText: { color: Palette.orange, fontSize: 13, fontWeight: '600' },
  lostToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lostToggleText: { color: Palette.warning, fontSize: 16, fontWeight: '800' },
  slotPick: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  slotChipActive: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  slotChipText: { color: Palette.text, fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkLabel: { color: Palette.text, fontSize: 15, fontWeight: '600' },
});
