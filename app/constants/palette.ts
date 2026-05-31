/** App palette + shared sizing. Usability-first: high contrast, large tap targets. */

import { COLOR_THRESHOLDS } from '@/constants/config';

export const Palette = {
  bg: '#0E1116', // app background (dark, easy on eyes outdoors at a kiosk)
  surface: '#171C24', // cards
  surfaceAlt: '#1F2630',
  border: '#2A323D',
  text: '#F2F5F8',
  textDim: '#9AA7B4',
  textFaint: '#6B7785',

  accent: '#3B82F6', // primary actions (blue)
  accentText: '#FFFFFF',

  // Energy status colors (also used by the sun dial).
  green: '#22C55E',
  orange: '#F59E0B',
  red: '#EF4444',

  // Slot states.
  slotFree: '#22344A',
  slotFreeBorder: '#33506E',
  slotOccupied: '#F59E0B',
  slotReady: '#22C55E',

  warning: '#F59E0B',
  danger: '#EF4444',
} as const;

/** Map a battery fraction (0..1) + discharging flag to a status color. */
export function batteryColor(fraction: number, discharging: boolean): string {
  if (fraction >= COLOR_THRESHOLDS.green || (fraction >= 0.999 && discharging)) return Palette.green;
  if (fraction < COLOR_THRESHOLDS.red) return Palette.red;
  return Palette.orange;
}

export const Radius = { sm: 8, md: 12, lg: 16, xl: 22 } as const;
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
