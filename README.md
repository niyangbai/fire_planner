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
  screens/       — Seven top-level views
  components/    — Shared UI: charts, cards, forms, layout
  constants/     — Event metadata (labels, icons, colors)
  utils/         — Currency formatting
```

### Data Model

A **Plan** contains:

- **Profile** — static snapshot: current age, current cash, and current investments.
- **Events** — an ordered list of `PlanEvent`s, each taking effect at a given age.
- **Lifeline checkpoints** — optional milestone targets for net worth, assets, liabilities, or spending.
- **Settings** — currency, projection horizon, growth assumptions, withdrawal rate, inflation, and Monte Carlo toggle.
- **Portfolio** — asset allocation, expected returns, volatility, and display colors.

Events are the source of truth for all financial flows. There are no redundant "current salary" fields in the profile — income, expenses, and contributions are all events.

**Supported event types:**

| Type | What it does |
|------|-------------|
| `job_income` | Sets monthly job income from a given age (zeroed at FIRE) |
| `annual_bonus` | Adds a lump-sum cash bonus once per year until FIRE, with optional `endAge` |
| `side_income` | Sets monthly side income (survives FIRE; optional end age) |
| `lump_sum_income` | One-time cash injection (inheritance, gift, asset sale, etc.) |
| `expense_change` | Sets monthly living expenses from a given age |
| `recurring_expense` | Adds a monthly expense on top of the baseline, with optional `endAge` |
| `lump_sum_expense` | One-time cash outflow (renovation, medical, etc.) |
| `buy_property` | Adds a property with purchase price, down payment, mortgage, and appreciation rate |
| `sell_property` | Sells a property and realizes net proceeds after selling cost and mortgage payoff |
| `contribution_change` | Sets monthly investment contribution |
| `lump_sum_investment` | Adds a one-time amount directly to investments |
| `retire` | Marks your FIRE age — zeroes job income, leaves side income intact |

Three **seed events** are auto-created when a plan is initialized: initial job income, initial expenses, and initial investment contribution. These are regular events and can be freely edited on the Timeline.

### Simulation Engine

The engine runs a **monthly simulation** from `currentAge` to `projectionEndAge`. Each month it:

1. Applies any events scheduled at the current age
2. Applies portfolio or settings-based investment growth monthly
3. Amortizes mortgage balances using per-property monthly interest rates
4. Computes cash flow from income, expenses, and contributions
5. Reinvests the monthly contribution
6. Records an annual snapshot

At each annual snapshot the engine checks if **investable assets ≥ spending × (100 / withdrawalRate)** — the 4% rule by default. The first age this holds is the **FIRE age**.

After FIRE, if cash goes negative, the engine draws down investments to cover the shortfall.

### Screens

**Dashboard** — Net worth trajectory (assets + liabilities + net worth as stacked areas), income vs. expenses bar chart, FIRE status card, upcoming timeline events.

**Timeline** — All events grouped by age. Add, edit, or delete any event. The form adapts its fields to the selected event type.

**Investments** — Portfolio allocation editor with weighted return and volatility stats. The projection engine uses the portfolio's weighted expected return when assets are defined.

**Projection** — Deep analysis: FIRE age, FIRE net worth, liabilities over time, monthly cash flow surplus, net worth at key ages (40/50/60/70), and a solver that back-calculates the required monthly contribution to hit a target FIRE age.

**Lifeline** — Goal checkpoints: set a target net worth, asset level, or liability ceiling at a given age. The engine automatically evaluates whether the projection meets each checkpoint.

**Plan Data** — Rename, export, import, and reset the current plan, with schema/version and saved-state details.

**Settings** — Currency, projection end age, growth mode, withdrawal rate, inflation rate, and advanced assumptions such as custom growth rate and Monte Carlo toggle.

### Key Design Decisions

**Event-driven, not form-driven.** Income and expenses are not fields you fill in once — they are events on a timeline. This lets you model raises, job changes, and lifestyle shifts with precision.

**Job income vs. side income.** `job_income` events contribute to `monthlyJobIncome`, which is zeroed when a `retire` event fires. `side_income` events contribute to `monthlySideIncome` and keep flowing unless they have an explicit end age. This distinction matters for realistic post-FIRE projections.

**Mortgage accuracy.** Each property stores the mortgage interest rate captured at purchase time. The engine uses proper P&I amortization, so liability balances decline correctly over the loan term.

**Local-first, schema-versioned.** All state is stored in browser `localStorage`. A `SCHEMA_VERSION` constant gates migrations so old stored plans don't corrupt new data shapes.

---

## Getting Started

```bash
npm install
npm run dev
```

On first launch, an onboarding flow collects your current age, assets, salary, and spending to seed the plan with sensible starting events. Everything can be changed from the Timeline afterward.

Useful checks:

```bash
npm test
npm run build
```

## GitHub Pages Deploy

This repo includes [`.github/workflows/deploy-gh-pages.yml`](/home/niyang/dev/piggy_bank/.github/workflows/deploy-gh-pages.yml) for GitHub Pages deployment via Actions.

After pushing to `main`:

```bash
git push origin main
```

Enable Pages in the repository settings and set the source to `GitHub Actions`. The Vite build automatically switches its `base` path to `/<repo-name>/` inside GitHub Actions so static assets resolve correctly on project pages.
