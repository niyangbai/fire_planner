# FIRE Planner

A local-first, event-driven financial independence planner. Plan your path to FIRE (Financial Independence, Retire Early) by composing a timeline of life events — salary changes, home purchases, side income, bonuses, and more — and watching the projection engine play them out over decades.

No accounts, no servers. All data lives in your browser.

---

## Design

### Architecture

Pure frontend SPA — Vite + React + TypeScript. State is managed by Zustand and persisted to `localStorage`. The app is organized into:

```
src/
  types/         — Plan data model (discriminated union of event types)
  engine/        — Monthly simulation engine
  store/         — Zustand store with CRUD and auto-recompute
  screens/       — Five top-level views
  components/    — Shared UI: charts, cards, forms, layout
  constants/     — Event metadata (labels, icons, colors)
  utils/         — Currency formatting
```

### Data Model

A **Plan** has two parts:

- **Profile** — static snapshot: current age, retirement target age, current cash, current investments.
- **Events** — an ordered list of `PlanEvent`s, each taking effect at a given age.

Events are the source of truth for all financial flows. There are no redundant "current salary" fields in the profile — income, expenses, and contributions are all events.

**Supported event types:**

| Type | What it does |
|------|-------------|
| `salary_change` | Sets monthly job income from a given age (zeroed at retirement) |
| `side_income` | Sets monthly side income (survives retirement; optional end age) |
| `annual_bonus` | Lump-sum cash injection once per year (skipped after retirement) |
| `expense_change` | Sets monthly living expenses from a given age |
| `investment_contribution_change` | Sets monthly investment contribution |
| `buy_home` | Adds a property with purchase price, mortgage, rate, and term |
| `sell_home` | Liquidates a property at a given age |
| `home_appreciation` | Overrides annual growth rate for a specific property |
| `lump_sum_income` | One-time cash injection (inheritance, asset sale, etc.) |
| `lump_sum_expense` | One-time cash outflow (renovation, medical, etc.) |
| `retire` | Marks the retirement age — zeroes job income, leaves side income intact |
| `salary_change` (continued) | Can represent raises, career transitions, layoffs |

Three **seed events** are auto-created when a plan is initialized: initial job income, initial expenses, and initial investment contribution. These are regular events and can be freely edited on the Timeline.

### Simulation Engine

The engine runs a **monthly simulation** from `currentAge` to `projectionEndAge`. Each month it:

1. Applies any events scheduled at the current age
2. Computes cash flow: income (job + side) minus expenses, plus investment returns
3. Amortizes mortgage balances using per-property monthly interest rates
4. Reinvests the monthly contribution
5. Records an annual snapshot

At each annual snapshot the engine checks if **investable assets ≥ spending × (100 / withdrawalRate)** — the 4% rule by default. The first age this holds is the **FIRE age**.

Post-retirement, the engine applies the safe withdrawal rate: a monthly draw from investments to cover living expenses.

### Screens

**Dashboard** — Net worth trajectory (assets + liabilities + net worth as stacked areas), income vs. expenses bar chart, FIRE status card, upcoming timeline events.

**Timeline** — All events grouped by age. Add, edit, or delete any event. The form adapts its fields to the selected event type.

**Projection** — Deep analysis: FIRE age, retirement net worth, liabilities over time, monthly cash flow surplus, net worth at key ages (40/50/60/70), and a solver that back-calculates the required monthly contribution to hit a target retirement age.

**Lifeline** — Goal checkpoints: set a target net worth, asset level, or liability ceiling at a given age. The engine automatically evaluates whether the projection meets each checkpoint.

**Settings** — Currency, projection end age, investment return rate, withdrawal rate, inflation rate. A note field for free-form plan context.

### Key Design Decisions

**Event-driven, not form-driven.** Income and expenses are not fields you fill in once — they are events on a timeline. This lets you model raises, job changes, and lifestyle shifts with precision.

**Job income vs. side income.** `salary_change` events contribute to `monthlyJobIncome`, which is zeroed when a `retire` event fires. `side_income` events contribute to `monthlySideIncome` and keep flowing unless they have an explicit end age. This distinction matters for realistic post-retirement projections.

**Mortgage accuracy.** Each property stores the mortgage interest rate captured at purchase time. The engine uses proper P&I amortization, so liability balances decline correctly over the loan term.

**Local-first, schema-versioned.** All state is in `localStorage`. A `SCHEMA_VERSION` constant gates migrations so old stored plans don't corrupt new data shapes.

---

## Getting Started

```bash
npm install
npm run dev
```

On first launch, an onboarding flow collects your current age, assets, salary, and spending to seed the plan with sensible starting events. Everything can be changed from the Timeline afterward.

## GitHub Pages Deploy

This repo includes [`.github/workflows/deploy-gh-pages.yml`](/home/niyang/dev/piggy_bank/.github/workflows/deploy-gh-pages.yml) for GitHub Pages deployment via Actions.

After pushing to `main`:

```bash
git push origin main
```

Enable Pages in the repository settings and set the source to `GitHub Actions`. The Vite build automatically switches its `base` path to `/<repo-name>/` inside GitHub Actions so static assets resolve correctly on project pages.
