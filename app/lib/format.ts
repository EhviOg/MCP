import { CURRENCY } from '@/constants/config';

/** ₦ amount with thousands separators, no decimals. */
export function naira(amount: number): string {
  return `${CURRENCY}${Math.round(amount).toLocaleString('en-NG')}`;
}

/** Clock time like "2:30 PM" from a sim-clock ms value. */
export function clockTime(simMs: number): string {
  const d = new Date(simMs);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/** "2h 30m" / "45m" from a count of minutes. */
export function durationFromMins(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

/** "1h 04m 12s" elapsed from a count of milliseconds (used for engine uptime). */
export function uptimeFromMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

/** Watts -> "1.23 kW" (or "320 W" below 1 kW). */
export function kW(watts: number): string {
  if (watts < 1000) return `${Math.round(watts)} W`;
  return `${(watts / 1000).toFixed(2)} kW`;
}

/** Round to 1 decimal kWh. */
export function kWh(value: number): string {
  return `${value.toFixed(1)} kWh`;
}
