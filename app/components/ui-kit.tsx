/** Shared, legible UI primitives used across all screens. Large tap targets by default. */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { Palette, Radius, Space } from '@/constants/palette';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

export function Label({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function BigButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const palette: Record<BtnVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: Palette.accent, fg: Palette.accentText },
    secondary: { bg: Palette.surfaceAlt, fg: Palette.text, border: Palette.border },
    danger: { bg: Palette.danger, fg: '#fff' },
    ghost: { bg: 'transparent', fg: Palette.accent },
  };
  const p = palette[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: p.bg, borderColor: p.border ?? 'transparent', borderWidth: p.border ? 1 : 0 },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.btnInner}>
          {icon ? <Ionicons name={icon} size={20} color={p.fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.btnText, { color: p.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** A labelled readout used on the dashboard / systems screens. */
export function StatTile({
  label,
  value,
  unit,
  icon,
  color,
  style,
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.tile, style]}>
      <View style={styles.tileHead}>
        {icon ? <Ionicons name={icon} size={16} color={Palette.textDim} /> : null}
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      <Text style={[styles.tileValue, color ? { color } : null]}>
        {value}
        {unit ? <Text style={styles.tileUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Pill({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  sectionTitle: {
    color: Palette.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Space.sm,
  },
  label: { color: Palette.textDim, fontSize: 14, fontWeight: '600' },
  btn: {
    minHeight: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.lg,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  btnText: { fontSize: 17, fontWeight: '700' },
  tile: {
    backgroundColor: Palette.surfaceAlt,
    borderRadius: Radius.md,
    padding: Space.md,
    flexGrow: 1,
    minWidth: 130,
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  tileLabel: { color: Palette.textDim, fontSize: 13, fontWeight: '600' },
  tileValue: { color: Palette.text, fontSize: 24, fontWeight: '800' },
  tileUnit: { color: Palette.textDim, fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Palette.border, marginVertical: Space.md },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 12, fontWeight: '700' },
});
