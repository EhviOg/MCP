import type { CableType, PricingTier } from '@/constants/config';

export type DeviceType = 'phone' | 'powerbank';

export type SlotStatus = 'empty' | 'occupied';
export type Slot = {
  id: string; // A01..E20
  status: SlotStatus;
  ticketId: string | null;
};

export type TicketStatus = 'charging' | 'ready' | 'collected';

export type Ticket = {
  id: string;
  ticketNumber: string;
  slotId: string;
  deviceType: DeviceType;
  deviceName: string;
  mah: number;
  cableType: CableType;
  tierLabel: string;
  amountQuoted: number;
  amountReceived: number;
  /** Sim-clock timestamps (ms). Display formats these; demo time-scaling lives in the store. */
  dropOffSimMs: number;
  expectedReturnSimMs: number;
  chargeTimeMins: number;
  operatorInitials: string;
  photoUri: string | null;
  status: TicketStatus;
};

export type ActivityEvent = {
  id: string;
  simMs: number; // sim-clock time of the event
  kind: 'intake' | 'full' | 'collected' | 'system';
  message: string;
  /** When set, this feed item is a device that is full/ready and can be picked up. */
  ticketId?: string;
};

export type SolarState = {
  solarOn: boolean;
  generationW: number;
  consumptionW: number;
  batteryKwh: number;
  temperatureC: number;
  /** Sim-clock "now" in ms. */
  simNowMs: number;
  /** Real wall-clock ms when the engine started (for uptime). */
  engineStartRealMs: number;
};

/** One sampled point of energy history (for the analytics charts). */
export type EnergyPoint = {
  simMs: number;
  generatedWh: number;
  consumedWh: number;
};

export type { CableType, PricingTier };
