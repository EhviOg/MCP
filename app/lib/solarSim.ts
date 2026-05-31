/**
 * Pure simulation math for the solar system. No React, no state — just functions of the
 * sim clock. The store (lib/store.tsx) drives these on a tick and integrates the battery.
 *
 * Swap-in plan for real hardware: replace `generationWatts` / `temperatureC` with reads
 * from the live feed and keep `consumptionWatts` (it is already derived from real slot use).
 */

import {
  DEMO_MODE,
  PER_DEVICE_DRAW_WATTS,
  SOLAR_PEAK_WATTS,
  TEMPERATURE_RANGE,
} from '@/constants/config';
import type { EnergyPoint } from './types';

const MS_PER_HOUR = 3600 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Fractional hour-of-day (0..24) for a sim-clock ms value. */
export function hourOfDay(simMs: number): number {
  const into = ((simMs % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY;
  return into / MS_PER_HOUR;
}

/**
 * Daylight generation curve: a half-sine from dawn (06:00) to dusk (18:00) peaking at noon.
 * Zero at night. DEMO_MODE adds exaggerated swings so the battery (and sun color) visibly cycle.
 */
export function generationWatts(simMs: number): number {
  const h = hourOfDay(simMs);
  const dawn = 6;
  const dusk = 18;
  if (h <= dawn || h >= dusk) return 0;

  const phase = (h - dawn) / (dusk - dawn); // 0..1 across the day
  const base = Math.sin(phase * Math.PI); // half-sine, peaks at midday

  // Deterministic "cloud" wobble (no Math.random — keeps things resume/replay friendly).
  const wobble = 0.12 * Math.sin(simMs / (7 * 60 * 1000)) + 0.06 * Math.sin(simMs / (90 * 1000));
  let factor = base * (1 + (DEMO_MODE ? wobble * 2.5 : wobble));
  factor = Math.max(0, Math.min(1, factor));
  return Math.round(factor * SOLAR_PEAK_WATTS);
}

/** Consumption = number of slots actively charging * per-device draw. */
export function consumptionWatts(chargingCount: number): number {
  return chargingCount * PER_DEVICE_DRAW_WATTS;
}

/** Simulated ambient temperature: warm midday, cool at night, gentle noise. */
export function temperatureC(simMs: number): number {
  const h = hourOfDay(simMs);
  const dayPhase = Math.sin(((h - 6) / 24) * 2 * Math.PI); // peaks mid-afternoon-ish
  const { min, max } = TEMPERATURE_RANGE;
  const mid = (min + max) / 2;
  const amp = (max - min) / 2;
  const noise = 0.6 * Math.sin(simMs / (3 * 60 * 1000));
  return Math.round((mid + amp * dayPhase + noise) * 10) / 10;
}

/**
 * Seed ~7 days of hourly history so analytics charts are never empty before any live
 * session data is appended. Generation follows the daylight curve; consumption is a
 * plausible kiosk load that tracks daytime footfall.
 */
export function seedHistory(nowSimMs: number): EnergyPoint[] {
  const points: EnergyPoint[] = [];
  const startMs = nowSimMs - 7 * MS_PER_DAY;
  for (let t = startMs; t < nowSimMs; t += MS_PER_HOUR) {
    const genW = generationWatts(t);
    const h = hourOfDay(t);
    // Kiosk busier 08:00–20:00; model 8–60 charging devices across the day.
    const busy = Math.max(0, Math.sin(((h - 6) / 16) * Math.PI));
    const devices = Math.round(busy * 55);
    const consW = consumptionWatts(devices);
    points.push({
      simMs: t,
      generatedWh: Math.round(genW), // 1 hour sample => Wh == W
      consumedWh: Math.round(consW),
    });
  }
  return points;
}

export { MS_PER_HOUR, MS_PER_DAY };
