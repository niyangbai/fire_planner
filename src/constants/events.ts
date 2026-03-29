import type { EventType, PlanEvent } from '../types/plan';
import { formatCurrency } from '../utils/format';

// ── Visual metadata for each event type ──────────────────────────────────────

export const EVENT_META: Record<
  EventType,
  { emoji: string; label: string; color: string; bg: string; category: string }
> = {
  // Income
  job_income:          { emoji: '💰', label: 'Job Income',           color: '#4ade80', bg: '#4ade8018', category: 'Income' },
  annual_bonus:        { emoji: '🎁', label: 'Annual Bonus',         color: '#4ade80', bg: '#4ade8018', category: 'Income' },
  side_income:         { emoji: '💼', label: 'Side Income',          color: '#34d399', bg: '#34d39918', category: 'Side Income' },
  lump_sum_income:     { emoji: '💵', label: 'Lump Sum Income',      color: '#4ade80', bg: '#4ade8018', category: 'Income' },
  // Expenses
  expense_change:      { emoji: '🏠', label: 'Living Expenses',      color: '#f87171', bg: '#f8717118', category: 'Expense' },
  recurring_expense:   { emoji: '🔄', label: 'Recurring Expense',    color: '#f87171', bg: '#f8717118', category: 'Expense' },
  lump_sum_expense:    { emoji: '💸', label: 'Lump Sum Expense',     color: '#f87171', bg: '#f8717118', category: 'Expense' },
  // Real Estate
  buy_property:        { emoji: '🏡', label: 'Buy Property',         color: '#6c8cff', bg: '#6c8cff18', category: 'Real Estate' },
  sell_property:       { emoji: '🔑', label: 'Sell Property',        color: '#6c8cff', bg: '#6c8cff18', category: 'Real Estate' },
  // Investments
  contribution_change: { emoji: '📈', label: 'Monthly Contribution', color: '#a78bfa', bg: '#a78bfa18', category: 'Investment' },
  lump_sum_investment: { emoji: '💎', label: 'Lump Sum Investment',  color: '#a78bfa', bg: '#a78bfa18', category: 'Investment' },
  // Life
  retire:              { emoji: '🌅', label: 'FIRE',                 color: '#facc15', bg: '#facc1518', category: 'Life' },
};

// ── Human-readable summary line for each event ────────────────────────────────

export function eventSummary(event: PlanEvent, currency: string): string {
  switch (event.type) {
    case 'job_income':
      return `${formatCurrency(event.monthlyAmount, currency)}/mo`;
    case 'annual_bonus':
      return `${formatCurrency(event.annualAmount, currency)}/yr`;
    case 'side_income':
      return `+${formatCurrency(event.monthlyAmount, currency)}/mo`;
    case 'lump_sum_income':
      return `+${formatCurrency(event.amount, currency)}`;
    case 'expense_change':
      return `${formatCurrency(event.monthlyAmount, currency)}/mo`;
    case 'recurring_expense':
      return `-${formatCurrency(event.monthlyAmount, currency)}/mo`;
    case 'lump_sum_expense':
      return `-${formatCurrency(event.amount, currency)}`;
    case 'buy_property':
      return `${formatCurrency(event.purchasePrice, currency, true)} property`;
    case 'sell_property':
      return `Sell for ${formatCurrency(event.salePrice, currency, true)}`;
    case 'retire':
      return `${formatCurrency(event.targetMonthlySpending, currency)}/mo spend`;
    case 'contribution_change':
      return `${formatCurrency(event.monthlyAmount, currency)}/mo`;
    case 'lump_sum_investment':
      return `+${formatCurrency(event.amount, currency)}`;
    default:
      return '';
  }
}
