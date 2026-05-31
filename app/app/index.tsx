import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SlotGrid } from '@/components/SlotGrid';
import { SunDial } from '@/components/SunDial';
import { BigButton, Card, Pill, SectionTitle, StatTile } from '@/components/ui-kit';
import { BATTERY_CAPACITY_KWH, TOTAL_SLOTS } from '@/constants/config';
import { batteryColor, Palette, Radius, Space } from '@/constants/palette';
import { clockTime, kW, uptimeFromMs } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { ActivityEvent } from '@/lib/types';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const { solar, slots, activity } = state;

  const fraction = solar.batteryKwh / BATTERY_CAPACITY_KWH;
  const discharging = solar.consumptionW > solar.generationW;
  const sunColor = batteryColor(fraction, discharging);
  const inUse = slots.filter((s) => s.status === 'occupied').length;
  const uptimeMs = Date.now() - solar.engineStartRealMs;

  return (
    <ScrollView
      style={{ backgroundColor: Palette.bg }}
      contentContainerStyle={{ padding: Space.lg, paddingBottom: insets.bottom + Space.xxl, gap: Space.lg }}>
      {/* A) DASHBOARD */}
      <Card>
        <View style={styles.dashHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dashTitle}>Solar Engine</Text>
            <Pill
              text={solar.solarOn ? 'ONLINE' : 'OFFLINE'}
              color={solar.solarOn ? Palette.green : Palette.red}
            />
            <Text style={styles.simClock}>Station time {clockTime(solar.simNowMs)}</Text>
          </View>
          <SunDial color={sunColor} spinning={solar.solarOn && solar.generationW > 0} size={96} />
        </View>

        <View style={styles.tileRow}>
          <StatTile label="Generation" value={kW(solar.generationW)} icon="flash" color={Palette.green} />
          <StatTile label="Consumption" value={kW(solar.consumptionW)} icon="battery-charging" color={Palette.orange} />
        </View>
        <View style={styles.tileRow}>
          <StatTile
            label="Battery"
            value={`${Math.round(fraction * 100)}%`}
            unit={`· ${solar.batteryKwh.toFixed(1)}/${BATTERY_CAPACITY_KWH} kWh`}
            icon="battery-half"
            color={sunColor}
          />
          <StatTile label="Temperature" value={`${solar.temperatureC.toFixed(1)}°`} unit="C" icon="thermometer" />
        </View>
        <View style={styles.tileRow}>
          <StatTile label="Engine uptime" value={uptimeFromMs(uptimeMs)} icon="time" />
          <StatTile label="Slots in use" value={`${inUse}`} unit={`/ ${TOTAL_SLOTS}`} icon="grid" />
        </View>

        {/* Compact slot glance (read-only) */}
        <View style={styles.glance}>
          <SlotGrid cellSize={11} gap={3} showLegend={false} />
        </View>
      </Card>

      {/* B) BUTTON ROW (below the dashboard) */}
      <View style={styles.btnRow}>
        <BigButton title="Add Device" icon="add-circle" onPress={() => router.push('/add-device')} style={{ flex: 1 }} />
        <BigButton title="Slots" icon="grid" variant="secondary" onPress={() => router.push('/slots')} style={{ flex: 1 }} />
        <BigButton title="Systems" icon="pulse" variant="secondary" onPress={() => router.push('/systems')} style={{ flex: 1 }} />
      </View>

      {/* C) ACTIVITIES FEED */}
      <Card>
        <SectionTitle>Activity</SectionTitle>
        {activity.length === 0 ? (
          <Text style={styles.empty}>No activity yet.</Text>
        ) : (
          activity.slice(0, 25).map((e) => <ActivityRow key={e.id} event={e} />)
        )}
      </Card>
    </ScrollView>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const router = useRouter();
  const { state } = useStore();
  const ticket = event.ticketId ? state.tickets[event.ticketId] : null;
  // A "full/ready" feed item gets its own Pickup button -> opens the release gate directly.
  const showPickup = event.kind === 'full' && ticket?.status === 'ready';

  const icon: keyof typeof Ionicons.glyphMap =
    event.kind === 'full'
      ? 'checkmark-circle'
      : event.kind === 'intake'
        ? 'log-in'
        : event.kind === 'collected'
          ? 'log-out'
          : 'information-circle';
  const tint =
    event.kind === 'full' ? Palette.green : event.kind === 'collected' ? Palette.textDim : Palette.accent;

  return (
    <View style={styles.activityRow}>
      <Ionicons name={icon} size={20} color={tint} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.activityText}>{event.message}</Text>
        <Text style={styles.activityTime}>{clockTime(event.simMs)}</Text>
      </View>
      {showPickup ? (
        <Pressable
          style={styles.pickup}
          onPress={() => router.push({ pathname: '/release', params: { ticketId: ticket!.id } })}>
          <Text style={styles.pickupText}>Pickup</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dashHead: { flexDirection: 'row', alignItems: 'center', marginBottom: Space.lg },
  dashTitle: { color: Palette.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  simClock: { color: Palette.textDim, fontSize: 13, marginTop: 8 },
  tileRow: { flexDirection: 'row', gap: Space.md, marginBottom: Space.md },
  glance: { marginTop: Space.sm },
  btnRow: { flexDirection: 'row', gap: Space.sm },
  empty: { color: Palette.textDim, fontSize: 14 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.sm,
    paddingVertical: Space.sm,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  activityText: { color: Palette.text, fontSize: 15, fontWeight: '600' },
  activityTime: { color: Palette.textFaint, fontSize: 12, marginTop: 2 },
  pickup: { backgroundColor: Palette.green, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  pickupText: { color: '#062611', fontWeight: '800', fontSize: 14 },
});
