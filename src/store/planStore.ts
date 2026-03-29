import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Plan, PlanEvent, LifelineCheckpoint, Profile, Settings, AssetClass } from '../types/plan';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, DEFAULT_PORTFOLIO, SCHEMA_VERSION } from '../types/plan';
import type { ProjectionResult } from '../engine/projection';
import { runProjection } from '../engine/projection';

const STORAGE_KEY = 'fire_planner_plan';

export function makeSeedEvents(age: number, salary = 5000, expenses = 3000, contribution = 1000): PlanEvent[] {
  return [
    { id: uuidv4(), type: 'job_income',          startAge: age, title: 'Starting Salary',          monthlyAmount: salary       },
    { id: uuidv4(), type: 'expense_change',       startAge: age, title: 'Living Expenses',           monthlyAmount: expenses     },
    { id: uuidv4(), type: 'contribution_change',  startAge: age, title: 'Investment Contribution',   monthlyAmount: contribution },
  ] as PlanEvent[];
}

function createDefaultPlan(): Plan {
  const profile = { ...DEFAULT_PROFILE };
  return {
    id: uuidv4(),
    name: 'My FIRE Plan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    profile,
    events: makeSeedEvents(profile.currentAge),
    lifelineCheckpoints: [],
    settings: { ...DEFAULT_SETTINGS },
    portfolio: DEFAULT_PORTFOLIO.map((a) => ({ ...a })),
  };
}

function savePlan(plan: Plan) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // storage full or unavailable
  }
}

// v2 → v3: add portfolio
// v3 → v4: rename event types, remove retirementTargetAge from Profile, drop lifecycle_strategy_placeholder
const TYPE_REMAP_V3_V4: Record<string, string> = {
  salary_change:                  'job_income',
  recurring_side_income:          'side_income',
  one_time_income:                'lump_sum_income',
  living_expense_change:          'expense_change',
  one_time_expense:               'lump_sum_expense',
  buy_home:                       'buy_property',
  sell_home:                      'sell_property',
  retirement_start:               'retire',
  investment_contribution_change: 'contribution_change',
  one_time_investment:            'lump_sum_investment',
};

function loadPlan(): Plan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    let parsed = JSON.parse(raw) as Plan & Record<string, unknown>;

    // v2 → v3: add portfolio
    if (parsed.schemaVersion === 2) {
      parsed = {
        ...parsed,
        schemaVersion: 3,
        portfolio: DEFAULT_PORTFOLIO.map((a) => ({ ...a })),
      };
    }

    // v3 → v4: rename types, strip retirementTargetAge, remove placeholder
    if (parsed.schemaVersion === 3) {
      const rawProfile = parsed.profile as unknown as Record<string, unknown>;
      const { retirementTargetAge: _unused, ...cleanProfile } = rawProfile;
      void _unused;
      const rawEvents = (parsed.events ?? []) as unknown as Array<Record<string, unknown>>;
      const events = rawEvents
        .filter((e) => e['type'] !== 'lifecycle_strategy_placeholder')
        .map((e) => ({ ...e, type: TYPE_REMAP_V3_V4[e['type'] as string] ?? e['type'] }));
      parsed = {
        ...parsed,
        schemaVersion: 4,
        profile: cleanProfile as unknown as Profile,
        events: events as unknown as PlanEvent[],
      };
    }

    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    return parsed as Plan;
  } catch {
    return null;
  }
}

export type Screen = 'dashboard' | 'timeline' | 'lifeline' | 'investments' | 'projection' | 'data' | 'settings';

interface PlanStore {
  plan: Plan;
  projection: ProjectionResult | null;
  lastSaved: Date | null;
  activeScreen: Screen;
  isOnboarding: boolean;

  setScreen: (screen: Screen) => void;

  updateProfile: (profile: Partial<Profile>) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  updatePortfolio: (portfolio: AssetClass[]) => void;
  renamePlan: (name: string) => void;
  resetPlan: () => void;
  importPlan: (plan: Plan) => void;
  completeOnboarding: () => void;

  addEvent: (event: PlanEvent) => void;
  updateEvent: (event: PlanEvent) => void;
  deleteEvent: (id: string) => void;
  duplicateEvent: (id: string) => void;

  addCheckpoint: (checkpoint: LifelineCheckpoint) => void;
  updateCheckpoint: (checkpoint: LifelineCheckpoint) => void;
  deleteCheckpoint: (id: string) => void;

  _recompute: () => void;
  _save: () => void;
}

export const usePlanStore = create<PlanStore>((set, get) => {
  const stored = loadPlan();
  const initialPlan = stored ?? createDefaultPlan();
  const initialProjection = (() => {
    try { return runProjection(initialPlan); } catch { return null; }
  })();

  return {
    plan: initialPlan,
    projection: initialProjection,
    lastSaved: stored ? new Date() : null,
    activeScreen: 'dashboard',
    isOnboarding: !stored,

    setScreen: (screen) => set({ activeScreen: screen }),

    completeOnboarding: () => {
      set({ isOnboarding: false });
      get()._save();
    },

    updateProfile: (updates) => {
      set((state) => ({
        plan: { ...state.plan, profile: { ...state.plan.profile, ...updates }, updatedAt: new Date().toISOString() },
      }));
      get()._recompute();
      get()._save();
    },

    updateSettings: (updates) => {
      set((state) => ({
        plan: { ...state.plan, settings: { ...state.plan.settings, ...updates }, updatedAt: new Date().toISOString() },
      }));
      get()._recompute();
      get()._save();
    },

    updatePortfolio: (portfolio) => {
      set((state) => ({
        plan: { ...state.plan, portfolio, updatedAt: new Date().toISOString() },
      }));
      get()._recompute();
      get()._save();
    },

    renamePlan: (name) => {
      set((state) => ({ plan: { ...state.plan, name, updatedAt: new Date().toISOString() } }));
      get()._save();
    },

    resetPlan: () => {
      const fresh = createDefaultPlan();
      set({ plan: fresh, isOnboarding: true });
      get()._recompute();
      get()._save();
    },

    importPlan: (plan) => {
      set({ plan, isOnboarding: false });
      get()._recompute();
      get()._save();
    },

    addEvent: (event) => {
      set((state) => ({
        plan: { ...state.plan, events: [...state.plan.events, event], updatedAt: new Date().toISOString() },
      }));
      get()._recompute();
      get()._save();
    },

    updateEvent: (event) => {
      set((state) => ({
        plan: {
          ...state.plan,
          events: state.plan.events.map((e) => (e.id === event.id ? event : e)),
          updatedAt: new Date().toISOString(),
        },
      }));
      get()._recompute();
      get()._save();
    },

    deleteEvent: (id) => {
      set((state) => ({
        plan: { ...state.plan, events: state.plan.events.filter((e) => e.id !== id), updatedAt: new Date().toISOString() },
      }));
      get()._recompute();
      get()._save();
    },

    duplicateEvent: (id) => {
      const event = get().plan.events.find((e) => e.id === id);
      if (!event) return;
      get().addEvent({ ...event, id: uuidv4() });
    },

    addCheckpoint: (checkpoint) => {
      set((state) => ({
        plan: {
          ...state.plan,
          lifelineCheckpoints: [...state.plan.lifelineCheckpoints, checkpoint],
          updatedAt: new Date().toISOString(),
        },
      }));
      get()._recompute();
      get()._save();
    },

    updateCheckpoint: (checkpoint) => {
      set((state) => ({
        plan: {
          ...state.plan,
          lifelineCheckpoints: state.plan.lifelineCheckpoints.map((c) => (c.id === checkpoint.id ? checkpoint : c)),
          updatedAt: new Date().toISOString(),
        },
      }));
      get()._recompute();
      get()._save();
    },

    deleteCheckpoint: (id) => {
      set((state) => ({
        plan: {
          ...state.plan,
          lifelineCheckpoints: state.plan.lifelineCheckpoints.filter((c) => c.id !== id),
          updatedAt: new Date().toISOString(),
        },
      }));
      get()._recompute();
      get()._save();
    },

    _recompute: () => {
      try {
        set({ projection: runProjection(get().plan) });
      } catch {
        // keep previous projection on error
      }
    },

    _save: () => {
      savePlan(get().plan);
      set({ lastSaved: new Date() });
    },
  };
});
