export const SCHEMA_VERSION = 4;

// ── Event Types ────────────────────────────────────────────────────────────────
// Grouped by category. All financial flows are events — nothing lives in Profile.
//
//  Income     : job_income · annual_bonus · side_income · lump_sum_income
//  Expense    : expense_change · recurring_expense · lump_sum_expense
//  Real Estate: buy_property · sell_property
//  Investment : contribution_change · lump_sum_investment
//  Life       : retire

export type EventType =
  | 'job_income'
  | 'annual_bonus'
  | 'side_income'
  | 'lump_sum_income'
  | 'expense_change'
  | 'recurring_expense'
  | 'lump_sum_expense'
  | 'buy_property'
  | 'sell_property'
  | 'contribution_change'
  | 'lump_sum_investment'
  | 'retire';

export interface BaseEvent {
  id: string;
  type: EventType;
  startAge: number;
  endAge?: number;
  title: string;
  note?: string;
}

// ── Income Events ──────────────────────────────────────────────────────────────

/** Sets monthly job income from startAge. Zeroed automatically at retirement. */
export interface JobIncomeEvent extends BaseEvent {
  type: 'job_income';
  monthlyAmount: number;
}

/** Lump-sum bonus received once per year. Stops at retirement. Optional endAge. */
export interface AnnualBonusEvent extends BaseEvent {
  type: 'annual_bonus';
  annualAmount: number;
}

/** Monthly side/freelance income. Survives retirement. Optional endAge. */
export interface SideIncomeEvent extends BaseEvent {
  type: 'side_income';
  monthlyAmount: number;
}

/** One-time cash inflow (inheritance, gift, asset sale proceeds, etc.) */
export interface LumpSumIncomeEvent extends BaseEvent {
  type: 'lump_sum_income';
  amount: number;
}

// ── Expense Events ─────────────────────────────────────────────────────────────

/** Sets the baseline monthly living expense from startAge. */
export interface ExpenseChangeEvent extends BaseEvent {
  type: 'expense_change';
  monthlyAmount: number;
}

/** Adds a recurring monthly expense on top of baseline (e.g. car payment). Optional endAge. */
export interface RecurringExpenseEvent extends BaseEvent {
  type: 'recurring_expense';
  monthlyAmount: number;
}

/** One-time cash outflow (renovation, medical, large purchase, etc.) */
export interface LumpSumExpenseEvent extends BaseEvent {
  type: 'lump_sum_expense';
  amount: number;
}

// ── Real Estate Events ────────────────────────────────────────────────────────

export interface BuyPropertyEvent extends BaseEvent {
  type: 'buy_property';
  purchasePrice: number;
  downPayment: number;
  mortgageRate: number;           // annual %
  mortgageTerm: number;           // years
  propertyAppreciationRate?: number; // annual %, defaults to 0%
  propertyId: string;
}

export interface SellPropertyEvent extends BaseEvent {
  type: 'sell_property';
  salePrice: number;
  sellingCost?: number;
  propertyId: string;
}

// ── Investment Events ─────────────────────────────────────────────────────────

/** Sets the monthly investment contribution from startAge. */
export interface ContributionChangeEvent extends BaseEvent {
  type: 'contribution_change';
  monthlyAmount: number;
}

/** One-time lump-sum added directly to investments. */
export interface LumpSumInvestmentEvent extends BaseEvent {
  type: 'lump_sum_investment';
  amount: number;
}

// ── Life Milestone Events ─────────────────────────────────────────────────────

/** Marks the retirement age. Zeroes job income; sets target monthly spending. */
export interface RetireEvent extends BaseEvent {
  type: 'retire';
  targetMonthlySpending: number;
}

// ── Discriminated Union ────────────────────────────────────────────────────────

export type PlanEvent =
  | JobIncomeEvent
  | AnnualBonusEvent
  | SideIncomeEvent
  | LumpSumIncomeEvent
  | ExpenseChangeEvent
  | RecurringExpenseEvent
  | LumpSumExpenseEvent
  | BuyPropertyEvent
  | SellPropertyEvent
  | ContributionChangeEvent
  | LumpSumInvestmentEvent
  | RetireEvent;

// ── Lifeline ────────────────────────────────────────────────────────────────────

export interface LifelineCheckpoint {
  id: string;
  age: number;
  title: string;
  targetNetWorth?: number;
  targetAssets?: number;
  targetLiabilities?: number;
  targetMonthlySpending?: number;
  note?: string;
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

export interface AssetClass {
  id: string;
  name: string;
  allocation: number;     // 0–100, should sum to 100 across portfolio
  expectedReturn: number; // annual %, e.g. 10
  volatility: number;     // annual std dev %, e.g. 18
  color: string;
}

// ── Profile ─────────────────────────────────────────────────────────────────────
// Only snapshot values — all financial flows (income, expenses, retirement) are events.

export interface Profile {
  currentAge: number;
  currentCash: number;
  currentInvestments: number;
}

// ── Settings ────────────────────────────────────────────────────────────────────

export type GrowthMode = 'conservative' | 'base' | 'optimistic';

export interface Settings {
  projectionEndAge: number;
  currency: string;
  investmentGrowthMode: GrowthMode;
  customAnnualGrowthRate?: number;
  withdrawalRate: number;  // e.g. 4 for 4%
  inflationRate: number;   // e.g. 2 for 2%
  enableMonteCarlo: boolean;
}

// ── Plan ──────────────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  profile: Profile;
  events: PlanEvent[];
  lifelineCheckpoints: LifelineCheckpoint[];
  settings: Settings;
  portfolio: AssetClass[];
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  projectionEndAge: 90,
  currency: 'USD',
  investmentGrowthMode: 'base',
  withdrawalRate: 4,
  inflationRate: 2,
  enableMonteCarlo: false,
};

export const DEFAULT_PROFILE: Profile = {
  currentAge: 30,
  currentCash: 20000,
  currentInvestments: 50000,
};

export const GROWTH_RATES: Record<GrowthMode, number> = {
  conservative: 5,
  base: 7,
  optimistic: 10,
};

export const DEFAULT_PORTFOLIO: AssetClass[] = [
  { id: 'us-stocks', name: 'US Stocks',     allocation: 60, expectedReturn: 10, volatility: 18, color: '#6c8cff' },
  { id: 'intl',      name: 'International', allocation: 20, expectedReturn: 8,  volatility: 20, color: '#a78bfa' },
  { id: 'bonds',     name: 'Bonds',         allocation: 15, expectedReturn: 4,  volatility: 6,  color: '#4ade80' },
  { id: 'cash',      name: 'Cash & Equiv.', allocation: 5,  expectedReturn: 5,  volatility: 1,  color: '#7b82aa' },
];
