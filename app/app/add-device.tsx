import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoCapture } from '@/components/PhotoCapture';
import { BigButton, Card, Label, Pill, SectionTitle } from '@/components/ui-kit';
import {
  CABLE_TYPES,
  type CableType,
  powerBankChargeMins,
  resolveTier,
  SEED_PHONES,
  type SeedPhone,
  TOTAL_SLOTS,
} from '@/constants/config';
import { Palette, Radius, Space } from '@/constants/palette';
import { durationFromMins, naira } from '@/lib/format';
import { nextFreeSlot, useStore } from '@/lib/store';
import type { DeviceType } from '@/lib/types';

export default function AddDeviceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, intake } = useStore();

  const [deviceType, setDeviceType] = useState<DeviceType>('phone');
  const [query, setQuery] = useState('');
  const [phone, setPhone] = useState<SeedPhone | null>(null);
  const [pbMahText, setPbMahText] = useState('');
  const [cable, setCable] = useState<CableType | null>(null);
  const [amountText, setAmountText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Resolve capacity + charge time from the chosen path.
  const mah = deviceType === 'phone' ? phone?.mah ?? 0 : parseInt(pbMahText || '0', 10) || 0;
  const tier = mah > 0 ? resolveTier(mah) : null;
  const accepted = tier ? tier.price !== null : false;
  const chargeMins =
    deviceType === 'phone'
      ? phone?.chargeMins ?? 0
      : mah > 0 && accepted
        ? powerBankChargeMins(mah)
        : 0;
  const quoted = tier?.price ?? 0;

  const amountReceived = parseInt(amountText || '0', 10) || 0;
  const change = amountReceived - quoted;

  const freeSlot = nextFreeSlot(state.slots);
  const taken = state.slots.filter((s) => s.status === 'occupied').length;

  const filteredPhones = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEED_PHONES.slice(0, 8);
    return SEED_PHONES.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 12);
  }, [query]);

  const ready =
    !!cable && mah > 0 && accepted && !!freeSlot && (deviceType === 'phone' ? !!phone : true);

  const onGenerate = () => {
    if (!ready || !tier || !cable) return;
    const ticket = intake({
      deviceType,
      deviceName: deviceType === 'phone' ? phone!.name : `Power Bank ${mah.toLocaleString()} mAh`,
      mah,
      cableType: cable,
      tierLabel: tier.label,
      amountQuoted: quoted,
      amountReceived,
      chargeTimeMins: chargeMins,
      photoUri,
    });
    router.replace({ pathname: '/ticket', params: { ticketId: ticket.id } });
  };

  return (
    <ScrollView
      style={{ backgroundColor: Palette.bg }}
      contentContainerStyle={{ padding: Space.lg, paddingBottom: insets.bottom + Space.xxl, gap: Space.lg }}
      keyboardShouldPersistTaps="handled">
      {/* 1. Device type */}
      <Card>
        <SectionTitle>1 · Device type</SectionTitle>
        <View style={styles.segRow}>
          <Segment
            label="Mobile Phone"
            icon="phone-portrait"
            active={deviceType === 'phone'}
            onPress={() => {
              setDeviceType('phone');
              setPbMahText('');
            }}
          />
          <Segment
            label="Power Bank"
            icon="battery-full"
            active={deviceType === 'powerbank'}
            onPress={() => {
              setDeviceType('powerbank');
              setPhone(null);
            }}
          />
        </View>
      </Card>

      {/* 2. Capacity */}
      <Card>
        <SectionTitle>2 · Capacity</SectionTitle>
        {deviceType === 'phone' ? (
          <>
            <Label>Search phone model</Label>
            <TextInput
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                setPhone(null);
              }}
              placeholder="e.g. iPhone 11, Tecno Spark"
              placeholderTextColor={Palette.textFaint}
              style={styles.input}
            />
            {phone ? (
              <View style={styles.selected}>
                <Ionicons name="checkmark-circle" size={18} color={Palette.green} />
                <Text style={styles.selectedText}>
                  {phone.name} · {phone.mah.toLocaleString()} mAh · {durationFromMins(phone.chargeMins)}
                </Text>
              </View>
            ) : (
              <View style={styles.results}>
                {filteredPhones.map((p) => {
                  const t = resolveTier(p.mah);
                  return (
                    <Pressable key={p.name} style={styles.resultRow} onPress={() => setPhone(p)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName}>{p.name}</Text>
                        <Text style={styles.resultSub}>{p.mah.toLocaleString()} mAh</Text>
                      </View>
                      <Text style={styles.resultPrice}>{t.price !== null ? naira(t.price) : '—'}</Text>
                    </Pressable>
                  );
                })}
                {filteredPhones.length === 0 ? <Text style={styles.dim}>No matches.</Text> : null}
              </View>
            )}
          </>
        ) : (
          <>
            <Label>Printed capacity (mAh)</Label>
            <TextInput
              value={pbMahText}
              onChangeText={setPbMahText}
              placeholder="e.g. 10000"
              placeholderTextColor={Palette.textFaint}
              keyboardType="number-pad"
              style={styles.input}
            />
            {mah > 0 && !accepted ? (
              <View style={styles.notAccepted}>
                <Ionicons name="close-circle" size={20} color={Palette.red} />
                <Text style={styles.notAcceptedText}>
                  Above 20,000 mAh — NOT ACCEPTED. Cannot proceed.
                </Text>
              </View>
            ) : mah > 0 ? (
              <Text style={styles.dim}>Estimated charge time: {durationFromMins(chargeMins)}</Text>
            ) : null}
          </>
        )}
      </Card>

      {/* 3. Cable type */}
      <Card>
        <SectionTitle>3 · Cable type</SectionTitle>
        <View style={styles.segRow}>
          {CABLE_TYPES.map((c) => (
            <Segment key={c} label={c} active={cable === c} onPress={() => setCable(c)} />
          ))}
        </View>
      </Card>

      {/* 4. Quote */}
      <Card>
        <SectionTitle>4 · Quote</SectionTitle>
        {tier ? (
          <View style={styles.quoteRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.quoteTier}>{tier.label}</Text>
              <Text style={styles.dim}>Charge time {durationFromMins(chargeMins)}</Text>
            </View>
            <Text style={[styles.quotePrice, !accepted && { color: Palette.red }]}>
              {accepted ? naira(quoted) : 'N/A'}
            </Text>
          </View>
        ) : (
          <Text style={styles.dim}>Select a device to see the price.</Text>
        )}
      </Card>

      {/* 5. Payment */}
      <Card>
        <SectionTitle>5 · Payment</SectionTitle>
        <Label>Amount received (₦)</Label>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0"
          placeholderTextColor={Palette.textFaint}
          keyboardType="number-pad"
          style={styles.input}
        />
        {amountText && accepted ? (
          change >= 0 ? (
            <Text style={[styles.payNote, { color: Palette.green }]}>Change due: {naira(change)}</Text>
          ) : (
            <Text style={[styles.payNote, { color: Palette.orange }]}>
              Short by {naira(-change)} — you can still proceed.
            </Text>
          )
        ) : null}
      </Card>

      {/* 6. Slot */}
      <Card>
        <SectionTitle>6 · Slot</SectionTitle>
        <View style={styles.quoteRow}>
          <Text style={styles.dim}>
            {taken} taken / {TOTAL_SLOTS} total
          </Text>
          {freeSlot ? (
            <Pill text={`Auto-assigned · ${freeSlot.id}`} color={Palette.accent} />
          ) : (
            <Pill text="No free slots" color={Palette.red} />
          )}
        </View>
      </Card>

      {/* 7. Photo */}
      <Card>
        <SectionTitle>7 · Photo</SectionTitle>
        <PhotoCapture photoUri={photoUri} onCapture={setPhotoUri} />
      </Card>

      {/* 8. Generate */}
      <BigButton
        title={freeSlot ? 'Generate ticket' : 'No free slot'}
        icon="receipt"
        onPress={onGenerate}
        disabled={!ready}
      />
    </ScrollView>
  );
}

function Segment({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segment, active && styles.segmentActive]}>
      {icon ? (
        <Ionicons name={icon} size={18} color={active ? Palette.accentText : Palette.textDim} />
      ) : null}
      <Text style={[styles.segmentText, active && { color: Palette.accentText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segRow: { flexDirection: 'row', gap: Space.sm, flexWrap: 'wrap' },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surfaceAlt,
    flexGrow: 1,
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  segmentText: { color: Palette.textDim, fontWeight: '700', fontSize: 15 },
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
  results: { marginTop: Space.sm, gap: 2 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Space.sm,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  resultName: { color: Palette.text, fontSize: 16, fontWeight: '600' },
  resultSub: { color: Palette.textDim, fontSize: 13, marginTop: 2 },
  resultPrice: { color: Palette.accent, fontSize: 16, fontWeight: '800' },
  selected: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Space.md },
  selectedText: { color: Palette.text, fontSize: 16, fontWeight: '600', flex: 1 },
  dim: { color: Palette.textDim, fontSize: 14, marginTop: 8 },
  notAccepted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Space.md,
    backgroundColor: Palette.red + '22',
    borderRadius: Radius.sm,
    padding: Space.md,
  },
  notAcceptedText: { color: Palette.red, fontSize: 15, fontWeight: '700', flex: 1 },
  quoteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quoteTier: { color: Palette.text, fontSize: 16, fontWeight: '700' },
  quotePrice: { color: Palette.green, fontSize: 24, fontWeight: '900' },
  payNote: { marginTop: 10, fontSize: 15, fontWeight: '700' },
});
