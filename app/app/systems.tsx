import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pill, SectionTitle, StatTile } from '@/components/ui-kit';
import { BATTERY_CAPACITY_KWH, SOLAR_PEAK_WATTS } from '@/constants/config';
import { batteryColor, Palette, Radius, Space } from '@/constants/palette';
import { kW } from '@/lib/format';
import { MS_PER_DAY } from '@/lib/solarSim';
import { useStore } from '@/lib/store';
import type { EnergyPoint } from '@/lib/types';

type Range = 'hours' | 'days' | 'weeks' | 'months';
const RANGES: Range[] = ['hours', 'days', 'weeks', 'months'];

type Bucket = { label: string; generatedWh: number; consumedWh: number };

function bucketHistory(history: EnergyPoint[], range: Range): Bucket[] {
  if (history.length === 0) return [];

  if (range === 'hours') {
    return history.slice(-24).map((p) => {
      const h = new Date(p.simMs).getHours();
      return { label: `${h}`, generatedWh: p.generatedWh, consumedWh: p.consumedWh };
    });
  }

  const groupMs = range === 'days' ? MS_PER_DAY : range === 'weeks' ? 7 * MS_PER_DAY : 30 * MS_PER_DAY;
  const take = range === 'days' ? 7 : range === 'weeks' ? 4 : 3;
  const map = new Map<number, Bucket>();
  for (const p of history) {
    const key = Math.floor(p.simMs / groupMs);
    const cur = map.get(key) ?? { label: '', generatedWh: 0, consumedWh: 0 };
    cur.generatedWh += p.generatedWh;
    cur.consumedWh += p.consumedWh;
    const d = new Date(key * groupMs);
    cur.label =
      range === 'days'
        ? d.toLocaleDateString('en', { weekday: 'short' })
        : range === 'weeks'
          ? `W${d.getDate() <= 7 ? 1 : Math.ceil(d.getDate() / 7)}`
          : d.toLocaleDateString('en', { month: 'short' });
    map.set(key, cur);
  }
  return Array.from(map.values()).slice(-take);
}

export default function SystemsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useStore();
  const { solar, history } = state;
  const [range, setRange] = useState<Range>('hours');

  const fraction = solar.batteryKwh / BATTERY_CAPACITY_KWH;
  const discharging = solar.consumptionW > solar.generationW;
  const battColor = batteryColor(fraction, discharging);
  const panelFraction = solar.generationW / SOLAR_PEAK_WATTS;

  const buckets = useMemo(() => bucketHistory(history, range), [history, range]);

  return (
    <ScrollView
      style={{ backgroundColor: Palette.bg }}
      contentContainerStyle={{ padding: Space.lg, paddingBottom: insets.bottom + Space.xxl, gap: Space.lg }}>
      {/* BATTERIES */}
      <Card>
        <View style={styles.cardHead}>
          <SectionTitle>Battery bank</SectionTitle>
          <Pill text={discharging ? 'DISCHARGING' : 'CHARGING'} color={discharging ? Palette.orange : Palette.green} />
        </View>
        <View style={styles.tileRow}>
          <StatTile label="Charge" value={`${Math.round(fraction * 100)}%`} color={battColor} />
          <StatTile label="Stored" value={solar.batteryKwh.toFixed(1)} unit={`/ ${BATTERY_CAPACITY_KWH} kWh`} />
        </View>
        <Meter fraction={fraction} color={battColor} />
        <Text style={styles.dim}>
          Net flow {discharging ? '−' : '+'}
          {kW(Math.abs(solar.generationW - solar.consumptionW))}
        </Text>
      </Card>

      {/* PANELS */}
      <Card>
        <View style={styles.cardHead}>
          <SectionTitle>Solar panels</SectionTitle>
          <Pill text={solar.generationW > 0 ? 'GENERATING' : 'IDLE'} color={solar.generationW > 0 ? Palette.green : Palette.textDim} />
        </View>
        <View style={styles.tileRow}>
          <StatTile label="Live output" value={kW(solar.generationW)} color={Palette.green} />
          <StatTile label="Peak capacity" value={kW(SOLAR_PEAK_WATTS)} />
        </View>
        <Meter fraction={panelFraction} color={Palette.green} />
        <Text style={styles.dim}>{Math.round(panelFraction * 100)}% of 15 kW peak</Text>
      </Card>

      {/* ANALYTICS */}
      <Card>
        <SectionTitle>Energy analytics</SectionTitle>
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}>
              <Text style={[styles.rangeText, range === r && { color: Palette.accentText }]}>
                {r[0].toUpperCase() + r.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.legendRow}>
          <LegendDot color={Palette.green} label="Generated" />
          <LegendDot color={Palette.orange} label="Consumed" />
        </View>
        <BarChart buckets={buckets} />
      </Card>

      <Pressable onPress={() => router.replace('/')} style={styles.homeLink}>
        <Text style={styles.homeLinkText}>← Back to dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

function Meter({ fraction, color }: { fraction: number; color: string }) {
  return (
    <View style={styles.meter}>
      <View style={[styles.meterFill, { width: `${Math.max(0, Math.min(100, fraction * 100))}%`, backgroundColor: color }]} />
    </View>
  );
}

function BarChart({ buckets }: { buckets: Bucket[] }) {
  if (buckets.length === 0) return <Text style={styles.dim}>No data yet.</Text>;
  const max = Math.max(1, ...buckets.map((b) => Math.max(b.generatedWh, b.consumedWh)));
  const H = 140;
  return (
    <View style={styles.chart}>
      {buckets.map((b, i) => (
        <View key={i} style={styles.barGroup}>
          <View style={styles.bars}>
            <View style={[styles.bar, { height: (b.generatedWh / max) * H, backgroundColor: Palette.green }]} />
            <View style={[styles.bar, { height: (b.consumedWh / max) * H, backgroundColor: Palette.orange }]} />
          </View>
          <Text style={styles.barLabel} numberOfLines={1}>
            {b.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Space.md },
  tileRow: { flexDirection: 'row', gap: Space.md, marginBottom: Space.md },
  dim: { color: Palette.textDim, fontSize: 13, marginTop: Space.sm },
  meter: { height: 14, borderRadius: 7, backgroundColor: Palette.surfaceAlt, overflow: 'hidden', marginTop: Space.sm },
  meterFill: { height: '100%', borderRadius: 7 },
  rangeRow: { flexDirection: 'row', gap: Space.sm, marginVertical: Space.md },
  rangeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surfaceAlt,
    alignItems: 'center',
  },
  rangeBtnActive: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  rangeText: { color: Palette.textDim, fontWeight: '700', fontSize: 13 },
  legendRow: { flexDirection: 'row', gap: Space.lg, marginBottom: Space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { color: Palette.textDim, fontSize: 13, fontWeight: '600' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 170, gap: 4, marginTop: Space.sm },
  barGroup: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 140 },
  bar: { width: 7, borderRadius: 2 },
  barLabel: { color: Palette.textFaint, fontSize: 10, marginTop: 4 },
  homeLink: { alignItems: 'center', paddingVertical: Space.md },
  homeLinkText: { color: Palette.accent, fontSize: 15, fontWeight: '700' },
});
