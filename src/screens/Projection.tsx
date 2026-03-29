import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { usePlanStore } from '../store/planStore';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import ChartTooltip from '../components/charts/ChartTooltip';
import { formatCurrency } from '../utils/format';
import { solveMonthlyContribution } from '../engine/projection';

export default function Projection() {
  const { plan, projection } = usePlanStore();
  if (!projection) return null;

  const { settings, profile } = plan;
  const { annual, fireAge, retirementAge, peakLiability, runsOutOfMoney, runsOutAtAge } = projection;
  const currency = settings.currency;

  // Retirement age comes from the retire event, not a profile field
  const retireEventAge = plan.events.find((e) => e.type === 'retire')?.startAge ?? null;

  // Solve for required contribution if a retire event is set
  let requiredContrib: number | null = null;
  if (retireEventAge) {
    requiredContrib = solveMonthlyContribution(plan, retireEventAge);
  }

  const chartData = annual.map((s) => ({
    age: s.age,
    Cash: Math.round(Math.max(0, s.cash)),
    Investments: Math.round(Math.max(0, s.investments)),
    'Real Estate': Math.round(s.realEstate),
    Mortgage: Math.round(s.mortgage),
    'Net Worth': Math.round(s.netWorth),
    'Monthly Surplus': Math.round(s.monthlySurplus),
  }));

  // Projected net worth at key ages
  const keyAges = [40, 50, 60, 70].filter((a) => a > profile.currentAge);
  const netWorthAtAge = keyAges.map((a) => {
    const snap = annual.find((s) => s.age >= a);
    return { age: a, netWorth: snap?.netWorth ?? null };
  });

  const retirementSnap = retirementAge ? annual.find((s) => s.age >= retirementAge) : null;
  const fireSnap = fireAge ? annual.find((s) => s.age >= fireAge) : null;

  return (
    <div className="p-8 overflow-y-auto h-full">
      <PageHeader
        title="Projection & Analysis"
        subtitle="How your plan plays out over time."
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="FIRE Age"
          value={fireAge ? `${fireAge}` : '—'}
          sub={fireAge ? `${Math.round(fireAge - profile.currentAge)}y away` : 'Not reached in projection'}
          valueColor={fireAge && (!retireEventAge || fireAge <= retireEventAge) ? 'green' : fireAge ? 'yellow' : 'red'}
          icon={<TrendingUp size={15} />}
        />
        <StatCard
          label="Retirement Start"
          value={retirementAge ? `Age ${retirementAge}` : 'None planned'}
          sub={retirementSnap ? `${formatCurrency(retirementSnap.netWorth, currency, true)} net worth` : undefined}
          icon={<Clock size={15} />}
        />
        <StatCard
          label="Peak Liability"
          value={peakLiability?.amount ? formatCurrency(peakLiability.amount, currency, true) : 'None'}
          sub={peakLiability?.amount ? `at age ${Math.round(peakLiability.age)}` : undefined}
          valueColor={peakLiability?.amount ? 'yellow' : 'green'}
          icon={<AlertTriangle size={15} />}
        />
        <StatCard
          label="Plan Status"
          value={runsOutOfMoney ? `Runs out at ${Math.round(runsOutAtAge ?? 0)}` : 'Sustainable'}
          sub={runsOutOfMoney ? 'Increase contributions' : `To age ${settings.projectionEndAge}`}
          valueColor={runsOutOfMoney ? 'red' : 'green'}
          icon={runsOutOfMoney ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
        />
      </div>

      {/* Net Worth Over Time */}
      <Card className="p-6 mb-6">
        <div className="text-sm font-medium text-white mb-1">Net Worth Trajectory</div>
        <div className="text-xs text-[#7b82aa] mb-5">Full projection breakdown</div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6c8cff" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6c8cff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="reGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="age" tick={{ fill: '#7b82aa', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#7b82aa', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, currency, true)} width={70} />
            <Tooltip content={<ChartTooltip currency={currency} />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#7b82aa', paddingTop: 12 }} />
            {fireAge && <ReferenceLine x={Math.round(fireAge)} stroke="#6c8cff" strokeDasharray="4 4" label={{ value: 'FIRE', position: 'top', fill: '#6c8cff', fontSize: 10 }} />}
            {retirementAge && <ReferenceLine x={Math.round(retirementAge)} stroke="#a78bfa" strokeDasharray="4 4" label={{ value: 'Retire', position: 'top', fill: '#a78bfa', fontSize: 10 }} />}
            <Area type="monotone" dataKey="Investments" stroke="#6c8cff" fill="url(#invGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="Cash" stroke="#4ade80" fill="url(#cashGrad)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="Real Estate" stroke="#a78bfa" fill="url(#reGrad)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Liabilities */}
        <Card className="p-6">
          <div className="text-sm font-medium text-white mb-1">Liabilities Over Time</div>
          <div className="text-xs text-[#7b82aa] mb-5">Mortgage and debt balance</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mortGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="age" tick={{ fill: '#7b82aa', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7b82aa', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, currency, true)} width={65} />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              <Area type="monotone" dataKey="Mortgage" stroke="#f87171" fill="url(#mortGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly Surplus */}
        <Card className="p-6">
          <div className="text-sm font-medium text-white mb-1">Monthly Cash Flow</div>
          <div className="text-xs text-[#7b82aa] mb-5">Surplus / deficit per month</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="age" tick={{ fill: '#7b82aa', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7b82aa', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, currency, true)} width={65} />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              <Bar dataKey="Monthly Surplus" fill="#6c8cff" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Net Worth at Key Ages + Solve Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="text-sm font-medium text-white mb-4">Net Worth at Key Ages</div>
          <div className="flex flex-col gap-2">
            {netWorthAtAge.map(({ age, netWorth }) => (
              <div key={age} className="flex items-center justify-between bg-[#222638] rounded-lg px-4 py-3">
                <span className="text-sm text-[#7b82aa]">Age {age}</span>
                <span className="text-sm font-semibold text-white">
                  {netWorth !== null ? formatCurrency(netWorth, currency, true) : '—'}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-white mb-4">Plan Insights</div>
          <div className="flex flex-col gap-3">
            {fireSnap && (
              <div className="bg-[#6c8cff18] border border-[#6c8cff33] rounded-xl p-4">
                <div className="text-xs text-[#6c8cff] font-medium mb-1">Solve: FIRE Forward Projection</div>
                <div className="text-sm text-white">
                  With your current plan, you reach financial independence at age <strong>{fireAge}</strong> with <strong>{formatCurrency(fireSnap.netWorth, currency, true)}</strong> net worth.
                </div>
              </div>
            )}
            {retireEventAge && requiredContrib !== null && (
              <div className="bg-[#a78bfa18] border border-[#a78bfa33] rounded-xl p-4">
                <div className="text-xs text-[#a78bfa] font-medium mb-1">Solve: Required Monthly Contribution</div>
                <div className="text-sm text-white">
                  To retire at age <strong>{retireEventAge}</strong>, you need to invest approximately <strong>{formatCurrency(requiredContrib, currency)}/mo</strong>.
                </div>
              </div>
            )}
            {retireEventAge && requiredContrib === null && (
              <div className="bg-[#facc1518] border border-[#facc1533] rounded-xl p-4">
                <div className="text-xs text-[#facc15] font-medium mb-1">Solve: Required Monthly Contribution</div>
                <div className="text-sm text-white">
                  Retirement at age <strong>{retireEventAge}</strong> may not be achievable with contributions alone. Consider increasing income or reducing spending.
                </div>
              </div>
            )}
            {!retireEventAge && (
              <div className="text-sm text-[#7b82aa] p-4 bg-[#222638] rounded-xl">
                Add a <strong className="text-white">Retire</strong> event on the Timeline to unlock solve insights.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
