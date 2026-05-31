/**
 * SOLAR CHARGING STATION — central configuration.
 *
 * EVERY tunable value lives here. Solar/energy data is SIMULATED today; swapping in a
 * real hardware feed later should not require touching any screen — only this file and
 * the simulation engine (lib/solarSim.ts / lib/store.tsx).
 */

// ---------------------------------------------------------------------------
// KIOSK (charging slots, pricing, charge-time math)
// ---------------------------------------------------------------------------

export const ROWS = 5;
export const SLOTS_PER_ROW = 20;
export const TOTAL_SLOTS = ROWS * SLOTS_PER_ROW; // 100

/** Row letters A..E for slot IDs (A01..E20). */
export const ROW_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

/** Effective watts used for the power-bank charge-time ESTIMATE (NOT the 45W bus ceiling). */
export const EFFECTIVE_WATTS = 33;
export const LOSS_FACTOR = 1.25;
export const BATTERY_VOLTAGE = 3.7;

export const OPERATOR_INITIALS_DEFAULT = 'OP';

/** Currency symbol — Nigerian Naira. */
export const CURRENCY = '₦'; // ₦

// ---------------------------------------------------------------------------
// SOLAR SIMULATION
// ---------------------------------------------------------------------------

export const SOLAR_PEAK_WATTS = 15000; // 15 kW panel peak
export const BATTERY_CAPACITY_KWH = 20; // 20 kWh bank
export const PER_DEVICE_DRAW_WATTS = 33; // draw per actively-charging slot

/** Battery-percentage thresholds that drive the dashboard sun color. */
export const COLOR_THRESHOLDS = {
  red: 0.25, // below 25% -> red
  green: 0.9, // above 90% (or full + discharging) -> green; in between -> orange
} as const;

/** Demo mode: accelerate time + exaggerate swings so colors visibly cycle. */
export const DEMO_MODE = true;
/** 1 real minute ≈ 1 sim hour in demo mode (so 1 real second ≈ 1 sim minute). */
export const DEMO_TIME_SCALE = 60;

/** Simulated ambient temperature range (°C). */
export const TEMPERATURE_RANGE = { min: 24, max: 41 } as const;

/** How often the simulation advances (real milliseconds). */
export const SIM_TICK_MS = 1000;

// ---------------------------------------------------------------------------
// PRICING TIERS (by capacity in mAh)
// ---------------------------------------------------------------------------

export type PricingTier = {
  label: string;
  /** inclusive upper bound in mAh; null = no upper bound (not accepted). */
  maxMah: number | null;
  /** price in ₦; null = NOT ACCEPTED. */
  price: number | null;
};

export const PRICING_TIERS: PricingTier[] = [
  { label: 'Up to 5,000 mAh', maxMah: 5000, price: 200 },
  { label: '5,001 – 10,000 mAh', maxMah: 10000, price: 400 },
  { label: '10,001 – 15,000 mAh', maxMah: 15000, price: 600 },
  { label: '15,001 – 20,000 mAh', maxMah: 20000, price: 800 },
  { label: 'Above 20,000 mAh', maxMah: null, price: null }, // NOT ACCEPTED
];

/** Resolve the pricing tier for a given capacity. Returns the "not accepted" tier above 20,000. */
export function resolveTier(mah: number): PricingTier {
  for (const tier of PRICING_TIERS) {
    if (tier.maxMah !== null && mah <= tier.maxMah) return tier;
  }
  return PRICING_TIERS[PRICING_TIERS.length - 1]; // above 20,000 -> not accepted
}

export function isAccepted(mah: number): boolean {
  return resolveTier(mah).price !== null;
}

// ---------------------------------------------------------------------------
// CHARGE-TIME LOGIC
// ---------------------------------------------------------------------------

/**
 * Power-bank charge-time estimate in MINUTES, from exact printed mAh.
 *   hours = (mAh * 3.7 / 1000) / EFFECTIVE_WATTS * LOSS_FACTOR
 * (Phones use their real per-model chargeTimeMins from the seed list instead.)
 */
export function powerBankChargeMins(mah: number): number {
  const hours = ((mah * BATTERY_VOLTAGE) / 1000 / EFFECTIVE_WATTS) * LOSS_FACTOR;
  return Math.round(hours * 60);
}

// ---------------------------------------------------------------------------
// CABLE TYPES
// ---------------------------------------------------------------------------

export const CABLE_TYPES = ['C–C', 'C–Lightning', 'C–micro-USB'] as const;
export type CableType = (typeof CABLE_TYPES)[number];

// ---------------------------------------------------------------------------
// SEED PHONE LIST (name, mAh, charge time mins) — starting values, verify later.
// ---------------------------------------------------------------------------

export type SeedPhone = { name: string; mah: number; chargeMins: number };

export const SEED_PHONES: SeedPhone[] = [
  { name: 'iPhone 11', mah: 3110, chargeMins: 150 },
  { name: 'iPhone 12', mah: 2815, chargeMins: 120 },
  { name: 'iPhone 13', mah: 3240, chargeMins: 110 },
  { name: 'iPhone 14', mah: 3279, chargeMins: 110 },
  { name: 'iPhone 15', mah: 3349, chargeMins: 95 },
  { name: 'iPhone XR', mah: 2942, chargeMins: 160 },
  { name: 'Samsung Galaxy A04', mah: 5000, chargeMins: 130 },
  { name: 'Samsung Galaxy A14', mah: 5000, chargeMins: 120 },
  { name: 'Samsung Galaxy A24', mah: 5000, chargeMins: 110 },
  { name: 'Samsung Galaxy A54', mah: 5000, chargeMins: 90 },
  { name: 'Samsung Galaxy S21', mah: 4000, chargeMins: 60 },
  { name: 'Samsung Galaxy S23', mah: 3900, chargeMins: 65 },
  { name: 'Tecno Spark 10', mah: 5000, chargeMins: 110 },
  { name: 'Tecno Spark 20', mah: 5000, chargeMins: 105 },
  { name: 'Tecno Camon 20', mah: 5000, chargeMins: 80 },
  { name: 'Tecno Camon 19', mah: 5000, chargeMins: 90 },
  { name: 'Tecno Pop 7', mah: 5000, chargeMins: 150 },
  { name: 'Tecno Phantom X2', mah: 5160, chargeMins: 50 },
  { name: 'Infinix Hot 30', mah: 5000, chargeMins: 110 },
  { name: 'Infinix Hot 20', mah: 5000, chargeMins: 115 },
  { name: 'Infinix Note 30', mah: 5000, chargeMins: 55 },
  { name: 'Infinix Note 12', mah: 5000, chargeMins: 75 },
  { name: 'Infinix Zero 30', mah: 5000, chargeMins: 60 },
  { name: 'Infinix Smart 7', mah: 6000, chargeMins: 150 },
  { name: 'itel A56', mah: 4000, chargeMins: 170 },
  { name: 'itel A70', mah: 5000, chargeMins: 140 },
  { name: 'itel P40', mah: 6000, chargeMins: 135 },
  { name: 'itel Vision 3', mah: 5000, chargeMins: 150 },
  { name: 'Xiaomi Redmi 12', mah: 5000, chargeMins: 90 },
  { name: 'Xiaomi Redmi 12C', mah: 5000, chargeMins: 110 },
  { name: 'Xiaomi Redmi Note 12', mah: 5000, chargeMins: 75 },
  { name: 'Xiaomi Redmi Note 11', mah: 5000, chargeMins: 80 },
  { name: 'Xiaomi Poco X5', mah: 5000, chargeMins: 70 },
  { name: 'Oppo A78', mah: 5000, chargeMins: 65 },
  { name: 'Oppo A17', mah: 5000, chargeMins: 120 },
  { name: 'Oppo Reno 8', mah: 4500, chargeMins: 35 },
  { name: 'Vivo Y22', mah: 5000, chargeMins: 110 },
  { name: 'Vivo Y35', mah: 5000, chargeMins: 75 },
  { name: 'Nokia G21', mah: 5050, chargeMins: 130 },
  { name: 'Nokia C32', mah: 5000, chargeMins: 140 },
  { name: 'Huawei Y9 Prime', mah: 4000, chargeMins: 120 },
  { name: 'Google Pixel 7', mah: 4355, chargeMins: 110 },
];
