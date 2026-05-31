import * as Notifications from 'expo-notifications';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import {
  BATTERY_CAPACITY_KWH,
  DEMO_MODE,
  DEMO_TIME_SCALE,
  OPERATOR_INITIALS_DEFAULT,
  ROW_LETTERS,
  SIM_TICK_MS,
  SLOTS_PER_ROW,
} from '@/constants/config';
import {
  consumptionWatts,
  generationWatts,
  MS_PER_HOUR,
  seedHistory,
  temperatureC,
} from '@/lib/solarSim';
import type {
  ActivityEvent,
  CableType,
  DeviceType,
  EnergyPoint,
  Slot,
  SolarState,
  Ticket,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Small id helper (app runtime — fine to use a counter; avoids RNG ordering issues).
// ---------------------------------------------------------------------------
let _seq = 0;
const uid = (prefix: string) => `${prefix}_${(_seq += 1)}`;

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------
type State = {
  slots: Slot[];
  tickets: Record<string, Ticket>;
  activity: ActivityEvent[];
  history: EnergyPoint[];
  solar: SolarState;
  operatorInitials: string;
  ticketSeq: number;
  lastHistoryHour: number;
};

export type IntakeInput = {
  deviceType: DeviceType;
  deviceName: string;
  mah: number;
  cableType: CableType;
  tierLabel: string;
  amountQuoted: number;
  amountReceived: number;
  chargeTimeMins: number;
  photoUri: string | null;
};

type Action =
  | { type: 'TICK'; realDeltaMs: number }
  | { type: 'ADD_TICKET'; ticket: Ticket }
  | { type: 'RELEASE'; ticketId: string }
  | { type: 'SET_OPERATOR'; initials: string };

function makeSlots(): Slot[] {
  const slots: Slot[] = [];
  for (const letter of ROW_LETTERS) {
    for (let n = 1; n <= SLOTS_PER_ROW; n++) {
      slots.push({ id: `${letter}${n.toString().padStart(2, '0')}`, status: 'empty', ticketId: null });
    }
  }
  return slots;
}

export function nextFreeSlot(slots: Slot[]): Slot | null {
  return slots.find((s) => s.status === 'empty') ?? null;
}

function countCharging(tickets: Record<string, Ticket>): number {
  let n = 0;
  for (const id in tickets) if (tickets[id].status === 'charging') n++;
  return n;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function init(): State {
  const realNow = Date.now();
  // Anchor the sim clock at 06:00 "today" so the demo sweeps dawn -> peak -> dusk quickly.
  const d = new Date(realNow);
  d.setHours(6, 0, 0, 0);
  const simStart = d.getTime();

  return {
    slots: makeSlots(),
    tickets: {},
    activity: [
      { id: uid('ev'), simMs: simStart, kind: 'system', message: 'Solar engine started' },
    ],
    history: seedHistory(simStart),
    operatorInitials: OPERATOR_INITIALS_DEFAULT,
    ticketSeq: 0,
    lastHistoryHour: Math.floor(simStart / MS_PER_HOUR),
    solar: {
      solarOn: true,
      generationW: generationWatts(simStart),
      consumptionW: 0,
      batteryKwh: BATTERY_CAPACITY_KWH * 0.6, // start at 60% -> orange, will visibly move
      temperatureC: temperatureC(simStart),
      simNowMs: simStart,
      engineStartRealMs: realNow,
    },
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_OPERATOR':
      return { ...state, operatorInitials: action.initials || OPERATOR_INITIALS_DEFAULT };

    case 'ADD_TICKET': {
      const ticket = action.ticket;
      const slots = state.slots.map((s) =>
        s.id === ticket.slotId ? { ...s, status: 'occupied' as const, ticketId: ticket.id } : s,
      );
      const activity: ActivityEvent[] = [
        {
          id: uid('ev'),
          simMs: ticket.dropOffSimMs,
          kind: 'intake',
          message: `Checked in: ${ticket.deviceName} → Slot ${ticket.slotId}`,
        },
        ...state.activity,
      ];
      return {
        ...state,
        slots,
        tickets: { ...state.tickets, [ticket.id]: ticket },
        activity,
        ticketSeq: state.ticketSeq + 1,
      };
    }

    case 'RELEASE': {
      const ticket = state.tickets[action.ticketId];
      if (!ticket || ticket.status === 'collected') return state;
      const slots = state.slots.map((s) =>
        s.ticketId === ticket.id ? { ...s, status: 'empty' as const, ticketId: null } : s,
      );
      const activity: ActivityEvent[] = [
        {
          id: uid('ev'),
          simMs: state.solar.simNowMs,
          kind: 'collected',
          message: `Released: ${ticket.deviceName} from Slot ${ticket.slotId}`,
        },
        ...state.activity,
      ];
      return {
        ...state,
        slots,
        tickets: { ...state.tickets, [ticket.id]: { ...ticket, status: 'collected' } },
        activity,
      };
    }

    case 'TICK': {
      const scale = DEMO_MODE ? DEMO_TIME_SCALE : 1;
      const simDelta = action.realDeltaMs * scale;
      if (simDelta <= 0) return state;
      const simNow = state.solar.simNowMs + simDelta;
      const genW = state.solar.solarOn ? generationWatts(simNow) : 0;

      // Promote any charging device that has reached its expected return time.
      let tickets = state.tickets;
      const newlyReady: Ticket[] = [];
      for (const id in state.tickets) {
        const t = state.tickets[id];
        if (t.status === 'charging' && simNow >= t.expectedReturnSimMs) {
          if (tickets === state.tickets) tickets = { ...state.tickets };
          tickets[id] = { ...t, status: 'ready' };
          newlyReady.push(tickets[id]);
        }
      }

      const consW = consumptionWatts(countCharging(tickets));

      // Integrate the battery balance over the elapsed sim time.
      const deltaH = simDelta / MS_PER_HOUR;
      const batt = clamp(
        state.solar.batteryKwh + ((genW - consW) / 1000) * deltaH,
        0,
        BATTERY_CAPACITY_KWH,
      );

      // Append a history sample at each sim-hour boundary (keep ~14 days).
      let history = state.history;
      let lastHistoryHour = state.lastHistoryHour;
      const curHour = Math.floor(simNow / MS_PER_HOUR);
      if (curHour > lastHistoryHour) {
        history = [...state.history, { simMs: curHour * MS_PER_HOUR, generatedWh: genW, consumedWh: consW }];
        lastHistoryHour = curHour;
        if (history.length > 24 * 14) history = history.slice(history.length - 24 * 14);
      }

      let activity = state.activity;
      if (newlyReady.length) {
        const evs: ActivityEvent[] = newlyReady.map((t) => ({
          id: uid('ev'),
          simMs: simNow,
          kind: 'full',
          message: `Device full: Slot ${t.slotId}`,
          ticketId: t.id,
        }));
        activity = [...evs, ...state.activity];
      }

      return {
        ...state,
        tickets,
        activity,
        history,
        lastHistoryHour,
        solar: {
          ...state.solar,
          simNowMs: simNow,
          generationW: genW,
          consumptionW: consW,
          batteryKwh: batt,
          temperatureC: temperatureC(simNow),
        },
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
type StoreValue = {
  state: State;
  intake: (input: IntakeInput) => Ticket;
  release: (ticketId: string) => void;
  setOperator: (initials: string) => void;
  banner: string | null;
  dismissBanner: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const [banner, setBanner] = useState<string | null>(null);
  const lastRealRef = useRef<number>(Date.now());
  const notifiedRef = useRef<Set<string>>(new Set());

  // Ask for local-notification permission once (best-effort; banner is the fallback).
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') await Notifications.requestPermissionsAsync();
      } catch {
        // Expo Go may not support notifications on all platforms — ignore, banner covers it.
      }
    })();
  }, []);

  // Simulation heartbeat.
  useEffect(() => {
    lastRealRef.current = Date.now();
    const handle = setInterval(() => {
      const now = Date.now();
      const delta = now - lastRealRef.current;
      lastRealRef.current = now;
      dispatch({ type: 'TICK', realDeltaMs: delta });
    }, SIM_TICK_MS);
    return () => clearInterval(handle);
  }, []);

  // Fire notification + in-app banner for newly-full devices.
  useEffect(() => {
    const fresh = state.activity.filter(
      (e) => e.kind === 'full' && e.ticketId && !notifiedRef.current.has(e.id),
    );
    if (fresh.length === 0) return;
    for (const e of fresh) notifiedRef.current.add(e.id);
    const latest = fresh[0];
    setBanner(latest.message + ' — ready for pickup');
    (async () => {
      try {
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Charging complete', body: latest.message },
          trigger: null,
        });
      } catch {
        // Local notifications unavailable here — banner already shown.
      }
    })();
  }, [state.activity]);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      intake: (input: IntakeInput) => {
        const slot = nextFreeSlot(state.slots);
        if (!slot) throw new Error('No free slot available');
        const seq = state.ticketSeq + 1;
        const sim = state.solar.simNowMs;
        const ticket: Ticket = {
          id: uid('tk'),
          ticketNumber: `T-${seq.toString().padStart(3, '0')}`,
          slotId: slot.id,
          deviceType: input.deviceType,
          deviceName: input.deviceName,
          mah: input.mah,
          cableType: input.cableType,
          tierLabel: input.tierLabel,
          amountQuoted: input.amountQuoted,
          amountReceived: input.amountReceived,
          dropOffSimMs: sim,
          expectedReturnSimMs: sim + input.chargeTimeMins * 60 * 1000,
          chargeTimeMins: input.chargeTimeMins,
          operatorInitials: state.operatorInitials,
          photoUri: input.photoUri,
          status: 'charging',
        };
        dispatch({ type: 'ADD_TICKET', ticket });
        return ticket;
      },
      release: (ticketId: string) => dispatch({ type: 'RELEASE', ticketId }),
      setOperator: (initials: string) => dispatch({ type: 'SET_OPERATOR', initials }),
      banner,
      dismissBanner: () => setBanner(null),
    }),
    [state, banner],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

// Convenience selectors.
export function useSolar(): SolarState {
  return useStore().state.solar;
}

export type { State };
