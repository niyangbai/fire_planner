import type { Plan, PlanEvent, AssetClass } from '../types/plan';
import { GROWTH_RATES } from '../types/plan';

// ── Monthly Projection Engine ────────────────────────────────────────────────

export interface MonthlySnapshot {
  age: number;
  year: number;
  month: number;
  cash: number;
  investments: number;
  realEstate: number;
  mortgage: number;
  otherDebt: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyInvestmentContrib: number;
  monthlySurplus: number;
  isRetired: boolean;
}

export interface AnnualSnapshot {
  age: number;
  cash: number;
  investments: number;
  realEstate: number;
  mortgage: number;
  otherDebt: number;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyJobIncome: number;
  monthlySideIncome: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyInvestmentContrib: number;
  monthlySurplus: number;
  isRetired: boolean;
}

export interface ProjectionResult {
  annual: AnnualSnapshot[];
  fireAge: number | null;
  retirementAge: number | null;
  peakLiability: { age: number; amount: number } | null;
  runsOutOfMoney: boolean;
  runsOutAtAge: number | null;
}

interface PropertyState {
  id: string;
  value: number;
  mortgageBalance: number;
  monthlyPayment: number;
  mortgageMonthlyRate: number;
  appreciationRate: number;
}

// Exported so tests and UI can use the same formula.
export function mortgageMonthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (annualRate === 0) return principal / (termYears * 12);
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// Returns the allocation-weighted expected return, or null if portfolio is empty.
// Exported so Investments screen uses the same formula as the engine.
export function portfolioWeightedReturn(portfolio: AssetClass[]): number | null {
  const total = portfolio.reduce((s, a) => s + a.allocation, 0);
  if (total === 0) return null;
  return portfolio.reduce((s, a) => s + (a.allocation / total) * a.expectedReturn, 0);
}

export function runProjection(plan: Plan): ProjectionResult {
  const { profile, events, settings } = plan;

  const portfolioReturn = portfolioWeightedReturn(plan.portfolio);
  const annualGrowthRate = portfolioReturn ?? settings.customAnnualGrowthRate ?? GROWTH_RATES[settings.investmentGrowthMode];
  const monthlyGrowthRate = annualGrowthRate / 100 / 12;

  const startAge = profile.currentAge;
  const endAge = settings.projectionEndAge;
  const totalMonths = (endAge - startAge) * 12;

  // Pre-read the retire event's target spending so FIRE detection can use
  // the user's intended retirement budget, not their current expenses.
  const retireEventSpending = (() => {
    const ev = events.find((e) => e.type === 'retire');
    return ev?.type === 'retire' ? ev.targetMonthlySpending : null;
  })();

  // ── State ─────────────────────────────────────────────────────────────────
  let cash = profile.currentCash;
  let investments = profile.currentInvestments;
  let monthlyJobIncome = 0;
  let monthlySideIncome = 0;
  let monthlyExpenses = 0;
  let monthlyInvestmentContrib = 0;
  let isRetired = false;

  const properties = new Map<string, PropertyState>();
  const sortedEvents = [...events].sort((a, b) => a.startAge - b.startAge);
  const retireEventMonth = (() => {
    const retireEvent = sortedEvents.find((event) => event.type === 'retire');
    return retireEvent ? Math.round((retireEvent.startAge - startAge) * 12) : null;
  })();

  const annual: AnnualSnapshot[] = [];
  let fireAge: number | null = null;
  let retirementAge: number | null = null;
  let peakLiability: { age: number; amount: number } | null = null;
  let runsOutOfMoney = false;
  let runsOutAtAge: number | null = null;

  for (let m = 0; m <= totalMonths; m++) {
    const age = startAge + m / 12;

    // ── Apply events at this age ───────────────────────────────────────────
    for (const event of sortedEvents) {
      const eventStartMonth = Math.round((event.startAge - startAge) * 12);
      const eventEndMonth = event.endAge != null
        ? Math.round((event.endAge - startAge) * 12)
        : null;

      // Annual bonus: fires as lump-sum once/year, stops at retirement
      if (event.type === 'annual_bonus') {
        if (!isRetired) {
          const monthsSinceStart = m - eventStartMonth;
          const withinRange = monthsSinceStart >= 0 && (eventEndMonth === null || m <= eventEndMonth);
          const beforeRetirementMonth = retireEventMonth === null || m < retireEventMonth;
          if (withinRange && beforeRetirementMonth && monthsSinceStart % 12 === 0) {
            cash += event.annualAmount;
          }
        }
        continue;
      }

      // Job income events are silently skipped after retirement
      const isJobIncomeEvent = event.type === 'job_income';
      if (m === eventStartMonth && !(isRetired && isJobIncomeEvent)) {
        applyEventStart(event, properties, {
          setMonthlyJobIncome:         (v) => { monthlyJobIncome = v; },
          addMonthlySideIncome:        (v) => { monthlySideIncome += v; },
          setMonthlyExpenses:          (v) => { monthlyExpenses = v; },
          addMonthlyExpenses:          (v) => { monthlyExpenses += v; },
          addCash:                     (v) => { cash += v; },
          addInvestments:              (v) => { investments += v; },
          setMonthlyInvestmentContrib: (v) => { monthlyInvestmentContrib = v; },
          setRetired: (spending: number) => {
            isRetired = true;
            monthlyExpenses = spending;
            monthlyJobIncome = 0;
            monthlyInvestmentContrib = 0;
            retirementAge = age;
          },
        });
      }

      if (eventEndMonth != null && m === eventEndMonth) {
        applyEventEnd(event, {
          addMonthlySideIncome: (v) => { monthlySideIncome += v; },
          addMonthlyExpenses:   (v) => { monthlyExpenses += v; },
        });
      }
    }

    // ── Simulate this month ────────────────────────────────────────────────
    investments *= (1 + monthlyGrowthRate);

    let totalMortgage = 0;
    let totalRealEstate = 0;
    for (const [, prop] of properties) {
      if (prop.mortgageBalance > 0) {
        const interestPart = prop.mortgageBalance * prop.mortgageMonthlyRate;
        const actualPayment = Math.min(prop.monthlyPayment, prop.mortgageBalance + interestPart);
        cash -= actualPayment;
        prop.mortgageBalance = Math.max(0, prop.mortgageBalance - (actualPayment - interestPart));
      }
      prop.value *= (1 + prop.appreciationRate);
      totalMortgage += prop.mortgageBalance;
      totalRealEstate += prop.value;
    }

    const monthlyIncome = monthlyJobIncome + monthlySideIncome;
    const netCashFlow = monthlyIncome - monthlyExpenses - monthlyInvestmentContrib;
    cash += netCashFlow;
    investments += monthlyInvestmentContrib;

    if (isRetired && cash < 0) {
      investments += cash;
      cash = 0;
    }

    const totalAssets = Math.max(0, cash) + investments + totalRealEstate;
    const totalLiabilities = totalMortgage;
    const netWorth = totalAssets - totalLiabilities;

    // ── FIRE detection ─────────────────────────────────────────────────────
    // Uses the retire event's target spending if set, otherwise current expenses.
    // This means FIRE is measured against what you actually plan to spend in
    // retirement, not against your current (potentially higher) expenses.
    if (!fireAge && !isRetired) {
      const targetSpending = retireEventSpending ?? monthlyExpenses;
      const fireTarget = targetSpending * 12 * (100 / settings.withdrawalRate);
      if (investments + Math.max(0, cash) >= fireTarget) {
        fireAge = age;
      }
    }

    if (peakLiability === null || totalLiabilities > peakLiability.amount) {
      peakLiability = { age, amount: totalLiabilities };
    }
    if (!runsOutOfMoney && investments < 0) {
      runsOutOfMoney = true;
      runsOutAtAge = age;
    }

    // ── Annual snapshots ───────────────────────────────────────────────────
    if (m % 12 === 0) {
      annual.push({
        age: Math.round(age),
        cash: Math.max(0, cash),
        investments: Math.max(0, investments),
        realEstate: totalRealEstate,
        mortgage: totalMortgage,
        otherDebt: 0,
        netWorth,
        totalAssets,
        totalLiabilities,
        monthlyJobIncome,
        monthlySideIncome,
        monthlyIncome,
        monthlyExpenses,
        monthlyInvestmentContrib,
        monthlySurplus: netCashFlow,
        isRetired,
      });
    }
  }

  return {
    annual,
    fireAge: fireAge ? Math.round(fireAge * 10) / 10 : null,
    retirementAge: retirementAge ? Math.round(retirementAge * 10) / 10 : null,
    peakLiability,
    runsOutOfMoney,
    runsOutAtAge,
  };
}

// ── Event Application ─────────────────────────────────────────────────────────

interface StateSetters {
  setMonthlyJobIncome: (v: number) => void;
  addMonthlySideIncome: (v: number) => void;
  setMonthlyExpenses: (v: number) => void;
  addMonthlyExpenses: (v: number) => void;
  addCash: (v: number) => void;
  addInvestments: (v: number) => void;
  setMonthlyInvestmentContrib: (v: number) => void;
  setRetired: (spending: number) => void;
}

function applyEventStart(
  event: PlanEvent,
  properties: Map<string, PropertyState>,
  setters: StateSetters,
) {
  switch (event.type) {
    case 'job_income':
      setters.setMonthlyJobIncome(event.monthlyAmount);
      break;
    case 'side_income':
      setters.addMonthlySideIncome(event.monthlyAmount);
      break;
    case 'lump_sum_income':
      setters.addCash(event.amount);
      break;
    case 'expense_change':
      setters.setMonthlyExpenses(event.monthlyAmount);
      break;
    case 'recurring_expense':
      setters.addMonthlyExpenses(event.monthlyAmount);
      break;
    case 'lump_sum_expense':
      setters.addCash(-event.amount);
      break;
    case 'buy_property': {
      const principal = event.purchasePrice - event.downPayment;
      const payment = mortgageMonthlyPayment(principal, event.mortgageRate, event.mortgageTerm);
      properties.set(event.propertyId, {
        id: event.propertyId,
        value: event.purchasePrice,
        mortgageBalance: principal,
        monthlyPayment: payment,
        mortgageMonthlyRate: event.mortgageRate / 100 / 12,
        appreciationRate: (event.propertyAppreciationRate ?? 3) / 100 / 12,
      });
      setters.addCash(-event.downPayment);
      break;
    }
    case 'sell_property': {
      const prop = properties.get(event.propertyId);
      if (prop) {
        const proceeds = event.salePrice - (event.sellingCost ?? 0) - prop.mortgageBalance;
        setters.addCash(proceeds);
        properties.delete(event.propertyId);
      }
      break;
    }
    case 'retire':
      setters.setRetired(event.targetMonthlySpending);
      break;
    case 'contribution_change':
      setters.setMonthlyInvestmentContrib(event.monthlyAmount);
      break;
    case 'lump_sum_investment':
      setters.addInvestments(event.amount);
      break;
    case 'annual_bonus':
      break; // handled in the main loop before applyEventStart is called
  }
}

function applyEventEnd(
  event: PlanEvent,
  setters: Pick<StateSetters, 'addMonthlySideIncome' | 'addMonthlyExpenses'>,
) {
  switch (event.type) {
    case 'side_income':
      setters.addMonthlySideIncome(-event.monthlyAmount);
      break;
    case 'recurring_expense':
      setters.addMonthlyExpenses(-event.monthlyAmount);
      break;
  }
}

// ── FIRE Insights ─────────────────────────────────────────────────────────────

export function computeFireInsights(plan: Plan, result: ProjectionResult) {
  const { profile, settings } = plan;
  const currentSnapshot = result.annual[0];
  if (!currentSnapshot) return null;

  const annualSpending = currentSnapshot.monthlyExpenses * 12;
  const fireNumber = annualSpending * (100 / settings.withdrawalRate);
  const currentFunds = currentSnapshot.investments + currentSnapshot.cash;
  const gap = Math.max(0, fireNumber - currentFunds);
  const yearsUntilFire = result.fireAge ? result.fireAge - profile.currentAge : null;

  return { fireNumber, currentFunds, gap, yearsUntilFire, fireAge: result.fireAge, retirementAge: result.retirementAge };
}

// ── Solve for Monthly Savings Needed ─────────────────────────────────────────

export function solveMonthlyContribution(plan: Plan, targetRetirementAge: number): number | null {
  const seedEvent = plan.events.find(
    (e) => e.type === 'contribution_change' && e.startAge === plan.profile.currentAge,
  );
  if (!seedEvent) return null;

  let lo = 0;
  let hi = 50000;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const patchedEvents = plan.events.map((e) =>
      e.id === seedEvent.id ? { ...e, monthlyAmount: mid } : e,
    );
    const result = runProjection({ ...plan, events: patchedEvents as typeof plan.events });
    if (result.fireAge !== null && result.fireAge <= targetRetirementAge) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return hi > 49000 ? null : Math.round(hi);
}
