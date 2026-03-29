import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  runProjection,
  computeFireInsights,
  solveMonthlyContribution,
  mortgageMonthlyPayment,
  portfolioWeightedReturn,
} from './projection';
import type { Plan } from '../types/plan';
import { DEFAULT_SETTINGS } from '../types/plan';

// ── Test helpers ─────────────────────────────────────────────────────────────

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'test',
    name: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 4,
    profile: { currentAge: 30, currentCash: 0, currentInvestments: 0 },
    events: [],
    lifelineCheckpoints: [],
    settings: { ...DEFAULT_SETTINGS, customAnnualGrowthRate: 0 }, // 0% growth by default
    portfolio: [],
    ...overrides,
  };
}

function id() { return uuidv4(); }

// ── mortgageMonthlyPayment ────────────────────────────────────────────────────

describe('mortgageMonthlyPayment', () => {
  it('matches standard amortization formula for 6% / 30yr', () => {
    // $300k at 6% over 30 years → ~$1,798.65/mo
    const pmt = mortgageMonthlyPayment(300_000, 6, 30);
    expect(pmt).toBeCloseTo(1798.65, 0);
  });

  it('handles 0% rate as simple equal payments', () => {
    const pmt = mortgageMonthlyPayment(120_000, 0, 10);
    expect(pmt).toBeCloseTo(1000, 5); // 120000 / 120 months
  });

  it('higher rate means higher payment', () => {
    const low  = mortgageMonthlyPayment(300_000, 3,  30);
    const high = mortgageMonthlyPayment(300_000, 7,  30);
    expect(high).toBeGreaterThan(low);
  });
});

// ── portfolioWeightedReturn ───────────────────────────────────────────────────

describe('portfolioWeightedReturn', () => {
  it('returns null for empty portfolio', () => {
    expect(portfolioWeightedReturn([])).toBeNull();
  });

  it('returns null when all allocations are 0', () => {
    const p = [{ id: '1', name: 'A', allocation: 0, expectedReturn: 10, volatility: 15, color: '#fff' }];
    expect(portfolioWeightedReturn(p)).toBeNull();
  });

  it('computes weighted return for a two-asset portfolio', () => {
    // 60% at 10% + 40% at 5% = 6 + 2 = 8%
    const p = [
      { id: '1', name: 'A', allocation: 60, expectedReturn: 10, volatility: 18, color: '#fff' },
      { id: '2', name: 'B', allocation: 40, expectedReturn: 5,  volatility: 5,  color: '#fff' },
    ];
    expect(portfolioWeightedReturn(p)).toBeCloseTo(8, 5);
  });

  it('normalizes allocations that do not sum to 100', () => {
    // 50/50 split of equal returns should stay equal
    const p = [
      { id: '1', name: 'A', allocation: 30, expectedReturn: 10, volatility: 15, color: '#fff' },
      { id: '2', name: 'B', allocation: 30, expectedReturn: 10, volatility: 15, color: '#fff' },
    ];
    expect(portfolioWeightedReturn(p)).toBeCloseTo(10, 5);
  });

  it('single-asset portfolio returns that asset\'s expected return', () => {
    const p = [{ id: '1', name: 'A', allocation: 100, expectedReturn: 7.5, volatility: 15, color: '#fff' }];
    expect(portfolioWeightedReturn(p)).toBeCloseTo(7.5, 5);
  });
});

// ── runProjection — cash flow ─────────────────────────────────────────────────

describe('runProjection — basic cash flow', () => {
  it('accumulates cash surplus and investment contributions over 2 years at 0% growth', () => {
    // Surplus: $5000 - $3000 - $1000 = $1000/mo to cash
    // Investments: $1000/mo
    const plan = makePlan({
      events: [
        { id: id(), type: 'job_income',         startAge: 30, title: 'Job',    monthlyAmount: 5000 },
        { id: id(), type: 'expense_change',     startAge: 30, title: 'Exp',    monthlyAmount: 3000 },
        { id: id(), type: 'contribution_change',startAge: 30, title: 'Contrib',monthlyAmount: 1000 },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 32, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap32 = result.annual.find((s) => s.age === 32)!;
    // Loop runs m=0..24 inclusive (25 months). First month fires events then simulates.
    // 25 months * $1000/mo surplus = $25,000 cash
    // 25 months * $1000/mo contrib = $25,000 investments
    expect(snap32.cash).toBeCloseTo(25_000, -1);
    expect(snap32.investments).toBeCloseTo(25_000, -1);
  });

  it('expense_change sets (replaces) the baseline expense', () => {
    // $2000 from age 30, then $5000 from age 32
    const plan = makePlan({
      events: [
        { id: id(), type: 'job_income',     startAge: 30, title: 'Job',   monthlyAmount: 10_000 },
        { id: id(), type: 'expense_change', startAge: 30, title: 'Exp1',  monthlyAmount: 2_000  },
        { id: id(), type: 'expense_change', startAge: 32, title: 'Exp2',  monthlyAmount: 5_000  },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 34, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    // Age 31: expenses should be $2000/mo → surplus = $8000/mo
    const snap31 = result.annual.find((s) => s.age === 31)!;
    expect(snap31.monthlyExpenses).toBe(2_000);
    // Age 33: expenses should be $5000/mo (replaced) → surplus = $5000/mo
    const snap33 = result.annual.find((s) => s.age === 33)!;
    expect(snap33.monthlyExpenses).toBe(5_000);
  });

  it('recurring_expense adds on top of baseline', () => {
    const plan = makePlan({
      events: [
        { id: id(), type: 'expense_change',   startAge: 30, title: 'Base', monthlyAmount: 3_000 },
        { id: id(), type: 'recurring_expense',startAge: 32, title: 'Car',  monthlyAmount: 500   },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 34, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap33 = result.annual.find((s) => s.age === 33)!;
    expect(snap33.monthlyExpenses).toBeCloseTo(3_500, 0);
  });

  it('lump_sum_income adds directly to cash', () => {
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 10_000, currentInvestments: 0 },
      events: [{ id: id(), type: 'lump_sum_income', startAge: 31, title: 'Bonus', amount: 50_000 }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 32, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap32 = result.annual.find((s) => s.age === 32)!;
    // Cash: $10k start + $50k bonus = $60k (no expenses/income)
    expect(snap32.cash).toBeCloseTo(60_000, -2);
  });

  it('lump_sum_investment goes directly to investments', () => {
    const plan = makePlan({
      events: [{ id: id(), type: 'lump_sum_investment', startAge: 31, title: 'ISA', amount: 20_000 }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 32, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap32 = result.annual.find((s) => s.age === 32)!;
    expect(snap32.investments).toBeCloseTo(20_000, -2);
  });
});

// ── runProjection — investment growth ─────────────────────────────────────────

describe('runProjection — investment growth', () => {
  it('investments compound monthly at the specified annual rate', () => {
    // Start with $100k, 12% annual growth (1% per month), no contributions, 1 year
    // Expected: 100000 * (1.01)^12 ≈ 112,682.50
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 0, currentInvestments: 100_000 },
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 31, customAnnualGrowthRate: 12 },
    });
    const result = runProjection(plan);
    const snap31 = result.annual.find((s) => s.age === 31)!;
    // Snapshot at age 31 = m=12, but loop runs m=0..12 (13 months of growth applied)
    expect(snap31.investments).toBeCloseTo(100_000 * Math.pow(1 + 0.12 / 12, 13), 0);
  });

  it('portfolio weighted return overrides customAnnualGrowthRate', () => {
    // Portfolio at 12%, customAnnualGrowthRate at 0% → should use 12%
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 0, currentInvestments: 100_000 },
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 31, customAnnualGrowthRate: 0 },
      portfolio: [
        { id: '1', name: 'A', allocation: 100, expectedReturn: 12, volatility: 20, color: '#fff' },
      ],
    });
    const result = runProjection(plan);
    const snap31 = result.annual.find((s) => s.age === 31)!;
    // 13 months of growth (m=0..12 inclusive)
    expect(snap31.investments).toBeCloseTo(100_000 * Math.pow(1 + 0.12 / 12, 13), 0);
  });
});

// ── runProjection — FIRE detection ───────────────────────────────────────────

describe('runProjection — FIRE detection', () => {
  it('detects FIRE when investable assets reach the withdrawal-rate multiple of expenses', () => {
    // $2000/mo expenses → $600k FIRE target at 4% withdrawal
    // Start with $600k investments → should fire immediately at age 30
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 0, currentInvestments: 600_000 },
      events: [{ id: id(), type: 'expense_change', startAge: 30, title: 'Exp', monthlyAmount: 2_000 }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 40, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    expect(result.fireAge).toBeCloseTo(30, 1);
  });

  it('does not detect FIRE when below the target', () => {
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 0, currentInvestments: 100_000 },
      events: [{ id: id(), type: 'expense_change', startAge: 30, title: 'Exp', monthlyAmount: 5_000 }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 31, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    // FIRE target = $5000*12*25 = $1.5M — nowhere near $100k
    expect(result.fireAge).toBeNull();
  });

  it('uses retire event target spending as the FIRE goal, not current expenses', () => {
    // Current expenses: $8000/mo (FIRE target = $2.4M)
    // Retire target:    $2000/mo (FIRE target = $600k)
    // Start with $600k investments → should reach FIRE under the retire-based target
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 0, currentInvestments: 600_000 },
      events: [
        { id: id(), type: 'expense_change', startAge: 30, title: 'Exp',    monthlyAmount: 8_000 },
        { id: id(), type: 'retire',         startAge: 65, title: 'Retire', targetMonthlySpending: 2_000 },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 70, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    // With the bug fix, FIRE is detected at the lower retire-based target
    expect(result.fireAge).not.toBeNull();
    expect(result.fireAge!).toBeLessThan(40);
  });

  it('cash also counts toward the FIRE target', () => {
    // $700k total (350k cash + 350k investments), FIRE target = $2k/mo * 12 * 25 = $600k.
    // After first month expenses ($2k), cash = 348k → total = 698k > 600k → FIRE at age 30.
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 350_000, currentInvestments: 350_000 },
      events: [{ id: id(), type: 'expense_change', startAge: 30, title: 'Exp', monthlyAmount: 2_000 }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 40, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    expect(result.fireAge).toBeCloseTo(30, 1);
  });

  it('FIRE is not detected after retirement starts', () => {
    // Retire at age 31, no way to detect FIRE afterwards
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 0, currentInvestments: 0 },
      events: [
        { id: id(), type: 'retire', startAge: 31, title: 'Retire', targetMonthlySpending: 100 },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 40, customAnnualGrowthRate: 100 },
    });
    const result = runProjection(plan);
    // Investments grow to nothing (start at 0), retired after age 31 → FIRE not set via post-retire path
    // Either fireAge is null (never reached target before retire) or it was pre-retire
    // With 0 investments and 100 growth, still won't meet the 25x target pre-retire
    expect(result.fireAge).toBeNull();
  });
});

// ── runProjection — retirement simulation ────────────────────────────────────

describe('runProjection — retirement simulation', () => {
  it('sets retirementAge when retire event fires', () => {
    const plan = makePlan({
      events: [{ id: id(), type: 'retire', startAge: 55, title: 'Retire', targetMonthlySpending: 4_000 }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 60, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    expect(result.retirementAge).toBeCloseTo(55, 1);
  });

  it('draws from investments when retirement cash flow is negative', () => {
    // $1M investments, $5000/mo spend, 0% growth, 10 years retirement
    // Expected: investments decrease by $5000 * 120 = $600k → ends at $400k
    const plan = makePlan({
      profile: { currentAge: 60, currentCash: 0, currentInvestments: 1_000_000 },
      events: [{ id: id(), type: 'retire', startAge: 60, title: 'Retire', targetMonthlySpending: 5_000 }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 70, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap70 = result.annual.find((s) => s.age === 70)!;
    // totalMonths = 120, loop runs m=0..120 (121 months of draws).
    // 1,000,000 - 121 * 5,000 = 395,000
    expect(snap70.investments).toBeCloseTo(395_000, -3);
  });

  it('marks runsOutOfMoney when investments go to zero', () => {
    // $100k, $5000/mo spend, 0% growth → runs out after 20 months
    const plan = makePlan({
      profile: { currentAge: 60, currentCash: 0, currentInvestments: 100_000 },
      events: [{ id: id(), type: 'retire', startAge: 60, title: 'Retire', targetMonthlySpending: 5_000 }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 80, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    expect(result.runsOutOfMoney).toBe(true);
    // 100000 / 5000 = 20 months ≈ 1.67 years → runs out around age 61.7
    expect(result.runsOutAtAge!).toBeGreaterThan(61);
    expect(result.runsOutAtAge!).toBeLessThan(62.5);
    expect(result.annual[result.annual.length - 1]!.age).toBeLessThan(80);
  });

  it('zeroes job income at retirement', () => {
    const plan = makePlan({
      events: [
        { id: id(), type: 'job_income', startAge: 30, title: 'Job',    monthlyAmount: 8_000 },
        { id: id(), type: 'retire',     startAge: 35, title: 'Retire', targetMonthlySpending: 3_000 },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 36, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap36 = result.annual.find((s) => s.age === 36)!;
    expect(snap36.monthlyJobIncome).toBe(0);
    expect(snap36.isRetired).toBe(true);
  });

  it('zeroes monthly investment contributions at FIRE and stops if the plan immediately goes broke', () => {
    const plan = makePlan({
      events: [
        { id: id(), type: 'contribution_change', startAge: 30, title: 'Contrib', monthlyAmount: 1_500 },
        { id: id(), type: 'retire', startAge: 35, title: 'Retire', targetMonthlySpending: 3_000 },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 36, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap35 = result.annual.find((s) => s.age === 35)!;
    expect(snap35.monthlyInvestmentContrib).toBe(0);
    expect(snap35.monthlySurplus).toBe(-3_000);
    expect(result.runsOutOfMoney).toBe(true);
    expect(result.runsOutAtAge).toBeCloseTo(35, 1);
  });

  it('side income continues through retirement', () => {
    const plan = makePlan({
      events: [
        { id: id(), type: 'side_income', startAge: 30, title: 'Freelance', monthlyAmount: 2_000 },
        { id: id(), type: 'retire',      startAge: 35, title: 'Retire',    targetMonthlySpending: 3_000 },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 37, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap36 = result.annual.find((s) => s.age === 36)!;
    expect(snap36.monthlySideIncome).toBe(2_000);
  });
});

// ── runProjection — real estate ───────────────────────────────────────────────

describe('runProjection — real estate', () => {
  it('deducts down payment from cash when buying property', () => {
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 200_000, currentInvestments: 0 },
      events: [{
        id: id(), type: 'buy_property', startAge: 30, title: 'House',
        purchasePrice: 400_000, downPayment: 80_000,
        mortgageRate: 6, mortgageTerm: 30, propertyId: 'home1',
      }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 31, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    // After buying: cash = 200k - 80k - (first mortgage payment) ≈ 120k - ~$1919
    const snap30 = result.annual[0];
    expect(snap30.cash).toBeCloseTo(200_000 - 80_000 - mortgageMonthlyPayment(320_000, 6, 30), 0);
  });

  it('mortgage balance decreases to ~0 after full term', () => {
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 5_000_000, currentInvestments: 0 },
      events: [{
        id: id(), type: 'buy_property', startAge: 30, title: 'House',
        purchasePrice: 400_000, downPayment: 80_000,
        mortgageRate: 6, mortgageTerm: 30, propertyId: 'home1',
      }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 61, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    // 31-year projection with 30-year mortgage → paid off
    const snap61 = result.annual.find((s) => s.age === 61)!;
    expect(snap61.mortgage).toBeCloseTo(0, -1);
  });

  it('property appreciates at the specified annual rate', () => {
    // $400k at 3%/yr over 10 years → 400000 * (1.03)^10 ≈ $537,566
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 5_000_000, currentInvestments: 0 },
      events: [{
        id: id(), type: 'buy_property', startAge: 30, title: 'House',
        purchasePrice: 400_000, downPayment: 400_000, // no mortgage for simpler test
        mortgageRate: 0, mortgageTerm: 30,
        propertyAppreciationRate: 3, propertyId: 'home1',
      }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 40, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap40 = result.annual.find((s) => s.age === 40)!;
    // Snapshot at age 40 = m=120, loop runs m=0..120 (121 applications of appreciation).
    const expectedValue = 400_000 * Math.pow(1 + 0.03 / 12, 121);
    expect(snap40.realEstate).toBeCloseTo(expectedValue, -2);
  });

  it('property stays flat when no appreciation rate is provided', () => {
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 500_000, currentInvestments: 0 },
      events: [{
        id: id(), type: 'buy_property', startAge: 30, title: 'Flat House',
        purchasePrice: 400_000, downPayment: 400_000,
        mortgageRate: 0, mortgageTerm: 30, propertyId: 'home-flat',
      }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 40, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap40 = result.annual.find((s) => s.age === 40)!;
    expect(snap40.realEstate).toBeCloseTo(400_000, -2);
  });

  it('sell_property adds proceeds to cash and removes mortgage', () => {
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 5_000_000, currentInvestments: 0 },
      events: [
        {
          id: id(), type: 'buy_property', startAge: 30, title: 'Buy',
          purchasePrice: 400_000, downPayment: 80_000, mortgageRate: 6, mortgageTerm: 30,
          propertyAppreciationRate: 0, propertyId: 'home1',
        },
        {
          id: id(), type: 'sell_property', startAge: 31, title: 'Sell',
          salePrice: 400_000, sellingCost: 20_000, propertyId: 'home1',
        },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 32, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap32 = result.annual.find((s) => s.age === 32)!;
    expect(snap32.realEstate).toBe(0);
    expect(snap32.mortgage).toBe(0);
  });
});

// ── runProjection — annual bonus ──────────────────────────────────────────────

describe('runProjection — annual bonus', () => {
  it('adds bonus once per year starting at startAge', () => {
    const plan = makePlan({
      events: [{
        id: id(), type: 'annual_bonus', startAge: 30, title: 'Bonus', annualAmount: 12_000,
      }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 33, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    // Loop runs m=0..36 (inclusive). Bonus fires at m=0,12,24,36 → 4 payments.
    // $12k * 4 = $48k
    const snap33 = result.annual.find((s) => s.age === 33)!;
    expect(snap33.cash).toBeCloseTo(48_000, -2);
  });

  it('stops bonus at endAge', () => {
    const plan = makePlan({
      events: [{
        id: id(), type: 'annual_bonus', startAge: 30, endAge: 32, title: 'Bonus', annualAmount: 10_000,
      }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 35, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    // Only 2 bonuses (age 30 and 31), not at 32 (endAge means ≤ endAge month)
    const snap35 = result.annual.find((s) => s.age === 35)!;
    expect(snap35.cash).toBeLessThan(30_001);
    expect(snap35.cash).toBeGreaterThan(19_999);
  });

  it('stops annual bonus after retirement starts', () => {
    const plan = makePlan({
      events: [
        { id: id(), type: 'annual_bonus', startAge: 30, title: 'Bonus', annualAmount: 10_000 },
        { id: id(), type: 'retire', startAge: 31, title: 'Retire', targetMonthlySpending: 0 },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 33, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap33 = result.annual.find((s) => s.age === 33)!;
    expect(snap33.cash).toBe(10_000);
  });
});

// ── runProjection — side income with endAge ───────────────────────────────────

describe('runProjection — side income with endAge', () => {
  it('side income stops at endAge', () => {
    const plan = makePlan({
      events: [
        { id: id(), type: 'side_income', startAge: 30, endAge: 32, title: 'Freelance', monthlyAmount: 1_000 },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 34, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap33 = result.annual.find((s) => s.age === 33)!;
    expect(snap33.monthlySideIncome).toBe(0);
  });
});

describe('runProjection — recurring expense with endAge', () => {
  it('removes the recurring expense after endAge', () => {
    const plan = makePlan({
      events: [
        { id: id(), type: 'expense_change', startAge: 30, title: 'Base', monthlyAmount: 2_000 },
        { id: id(), type: 'recurring_expense', startAge: 30, endAge: 32, title: 'Car', monthlyAmount: 500 },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 34, customAnnualGrowthRate: 0 },
    });
    const result = runProjection(plan);
    const snap31 = result.annual.find((s) => s.age === 31)!;
    const snap33 = result.annual.find((s) => s.age === 33)!;
    expect(snap31.monthlyExpenses).toBe(2_500);
    expect(snap33.monthlyExpenses).toBe(2_000);
  });
});

// ── computeFireInsights ───────────────────────────────────────────────────────

describe('computeFireInsights', () => {
  it('computes FIRE number as annual spending / withdrawal rate', () => {
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 0, currentInvestments: 0 },
      events: [{ id: id(), type: 'expense_change', startAge: 30, title: 'Exp', monthlyAmount: 3_000 }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 80, customAnnualGrowthRate: 7, withdrawalRate: 4 },
    });
    const result = runProjection(plan);
    const insights = computeFireInsights(plan, result)!;
    // FIRE number: $3000/mo * 12 * 25 = $900,000
    expect(insights.fireNumber).toBeCloseTo(900_000, -2);
  });

  it('gap is 0 when already at FIRE number', () => {
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 0, currentInvestments: 900_000 },
      events: [{ id: id(), type: 'expense_change', startAge: 30, title: 'Exp', monthlyAmount: 3_000 }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 80, customAnnualGrowthRate: 0, withdrawalRate: 4 },
    });
    const result = runProjection(plan);
    const insights = computeFireInsights(plan, result)!;
    expect(insights.gap).toBe(0);
  });

  it('counts cash in current funds when computing the gap', () => {
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 300_000, currentInvestments: 300_000 },
      events: [{ id: id(), type: 'expense_change', startAge: 30, title: 'Exp', monthlyAmount: 2_000 }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 80, customAnnualGrowthRate: 0, withdrawalRate: 4 },
    });
    const result = runProjection(plan);
    const insights = computeFireInsights(plan, result)!;
    expect(insights.currentFunds).toBe(result.annual[0].cash + result.annual[0].investments);
    expect(insights.currentFunds).toBeGreaterThan(result.annual[0].investments);
    expect(insights.gap).toBe(insights.fireNumber - insights.currentFunds);
  });

  it('yearsUntilFire matches difference between fireAge and currentAge', () => {
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 0, currentInvestments: 0 },
      events: [
        { id: id(), type: 'expense_change',     startAge: 30, title: 'Exp',    monthlyAmount: 2_000 },
        { id: id(), type: 'contribution_change',startAge: 30, title: 'Contrib',monthlyAmount: 2_000 },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 90, customAnnualGrowthRate: 7, withdrawalRate: 4 },
    });
    const result = runProjection(plan);
    const insights = computeFireInsights(plan, result)!;
    if (insights.fireAge && insights.yearsUntilFire) {
      expect(insights.yearsUntilFire).toBeCloseTo(insights.fireAge - 30, 1);
    }
  });
});

// ── solveMonthlyContribution ──────────────────────────────────────────────────

describe('solveMonthlyContribution', () => {
  it('returns null when no contribution_change event at currentAge', () => {
    const plan = makePlan({
      events: [{ id: id(), type: 'expense_change', startAge: 30, title: 'Exp', monthlyAmount: 3_000 }],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 90, customAnnualGrowthRate: 7 },
    });
    expect(solveMonthlyContribution(plan, 60)).toBeNull();
  });

  it('solves for a positive contribution amount', () => {
    const plan = makePlan({
      events: [
        { id: id(), type: 'contribution_change', startAge: 30, title: 'Contrib', monthlyAmount: 0 },
        { id: id(), type: 'expense_change',       startAge: 30, title: 'Exp',     monthlyAmount: 4_000 },
        { id: id(), type: 'retire',               startAge: 65, title: 'Retire',  targetMonthlySpending: 4_000 },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 90, customAnnualGrowthRate: 0, withdrawalRate: 4 },
    });
    // FIRE target = $4000*12*25 = $1.2M
    // 0% growth, 35 years = 420 months → need $1.2M/420 ≈ $2857/mo
    const contrib = solveMonthlyContribution(plan, 65);
    expect(contrib).not.toBeNull();
    expect(contrib!).toBeGreaterThan(2_500);
    expect(contrib!).toBeLessThan(3_500);
  });

  it('returns null when target is unreachable (hi > 49000)', () => {
    // Very short timeframe and huge spending → impossible
    const plan = makePlan({
      profile: { currentAge: 30, currentCash: 0, currentInvestments: 0 },
      events: [
        { id: id(), type: 'contribution_change', startAge: 30, title: 'Contrib', monthlyAmount: 0 },
        { id: id(), type: 'expense_change',       startAge: 30, title: 'Exp',     monthlyAmount: 100_000 },
        { id: id(), type: 'retire',               startAge: 31, title: 'Retire',  targetMonthlySpending: 100_000 },
      ],
      settings: { ...DEFAULT_SETTINGS, projectionEndAge: 90, customAnnualGrowthRate: 0, withdrawalRate: 4 },
    });
    // FIRE target = $30M, retire in 1 year → impossible with capped $50k/mo search
    expect(solveMonthlyContribution(plan, 31)).toBeNull();
  });
});
