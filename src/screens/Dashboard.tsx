import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { TrendingUp, Flame, Clock, AlertCircle, ArrowRight, Calendar } from 'lucide-react';
import { usePlanStore } from '../store/planStore';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import ChartTooltip from '../components/charts/ChartTooltip';
import { formatCurrency, formatAge, formatRelativeTime } from '../utils/format';
import { computeFireInsights } from '../engine/projection';
import { EVENT_META } from '../constants/events';

export default function Dashboard() {
  const { plan, projection, lastSaved, setScreen } = usePlanStore();

  if (!projection) {
    return <div className="flex items-center justify-center h-64 text-[#7b82aa]">Running projection...</div>;
  }

  const { profile, settings, events, lifelineCheckpoints } = plan;
  const retireAge = events.find((e) => e.type === 'retire')?.startAge ?? null;
  const currency = settings.currency;
  const insights  = computeFireInsights(plan, projection);
  const snap0     = projection.annual[0];

  const chartData = projection.annual.map((s) => {
    const cp = lifelineCheckpoints.find((c) => c.age === s.age);
    return {
      age:          s.age,
      'Net Worth':  Math.round(s.netWorth),
      Assets:       Math.round(s.totalAssets),
      Liabilities:  Math.round(s.totalLiabilities),
      ...(cp?.targetNetWorth ? { Target: cp.targetNetWorth } : {}),
    };
  });

  const upcomingEvents = [...events]
    .filter((e) => e.startAge > profile.currentAge)
    .sort((a, b) => a.startAge - b.startAge)
    .slice(0, 4);

  const surplus = snap0?.monthlySurplus ?? 0;

  const retirementNetWorth = (() => {
    const s = projection.retirementAge
      ? projection.annual.find((x) => x.age >= (projection.retirementAge ?? 0))
      : projection.annual[projection.annual.length - 1];
    return formatCurrency(s?.netWorth ?? 0, currency, true);
  })();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Dashboard"
        subtitle={`Viewing ${plan.name}`}
        action={<div className="text-xs text-[#7b82aa]">{lastSaved && `Saved ${formatRelativeTime(lastSaved)}`}</div>}
      />

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Current Age"        value={`${profile.currentAge}`}   sub="years old"     icon={<Clock size={16} />} />
        <StatCard label="Projected FIRE Age" value={insights?.fireAge ? `${insights.fireAge}` : '—'}
          sub={insights?.yearsUntilFire ? `${Math.round(insights.yearsUntilFire)} years away` : 'Add more details'}
          accent icon={<Flame size={16} />} />
        <StatCard label="Retirement"  value={retireAge ? `Age ${retireAge}` : '—'}
          sub={retireAge ? 'retire event on timeline' : 'Add a Retire event'} icon={<Calendar size={16} />} />
        <StatCard label="Current Net Worth"  value={formatCurrency(snap0?.netWorth ?? 0, currency, true)}
          sub={`${formatCurrency(snap0?.cash ?? 0, currency, true)} cash · ${formatCurrency(snap0?.investments ?? 0, currency, true)} invested`}
          icon={<TrendingUp size={16} />} />
        <StatCard label="Retirement Net Worth" value={retirementNetWorth} sub="at retirement" icon={<TrendingUp size={16} />} />
        <StatCard label="Monthly Surplus"    value={formatCurrency(surplus, currency)}
          sub={surplus >= 0 ? 'You are saving' : 'You are in deficit'} accent={surplus >= 0} />
      </div>

      {/* Net worth chart */}
      <Card className="p-6 mb-8">
        <div className="mb-6">
          <div className="text-sm font-medium text-white">Financial Overview Over Time</div>
          <div className="text-xs text-[#7b82aa] mt-0.5">
            Total Assets · Liabilities · Net Worth — age {profile.currentAge} to {settings.projectionEndAge}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="db-assets"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} /><stop offset="95%" stopColor="#4ade80" stopOpacity={0} /></linearGradient>
              <linearGradient id="db-networth" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6c8cff" stopOpacity={0.3}  /><stop offset="95%" stopColor="#6c8cff" stopOpacity={0} /></linearGradient>
              <linearGradient id="db-liab"     x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f87171" stopOpacity={0.25} /><stop offset="95%" stopColor="#f87171" stopOpacity={0} /></linearGradient>
            </defs>
            <XAxis dataKey="age" tick={{ fill: '#7b82aa', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#7b82aa', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, currency, true)} width={70} />
            <Tooltip content={<ChartTooltip currency={currency} />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#7b82aa', paddingTop: 12 }} />
            {projection.fireAge && (
              <ReferenceLine x={Math.round(projection.fireAge)} stroke="#6c8cff" strokeDasharray="4 4"
                label={{ value: 'FIRE', position: 'top', fill: '#6c8cff', fontSize: 11 }} />
            )}
            {projection.retirementAge && Math.round(projection.retirementAge) !== Math.round(projection.fireAge ?? 0) && (
              <ReferenceLine x={Math.round(projection.retirementAge)} stroke="#a78bfa" strokeDasharray="4 4"
                label={{ value: 'Retire', position: 'top', fill: '#a78bfa', fontSize: 11 }} />
            )}
            <Area type="monotone" dataKey="Assets"      stroke="#4ade80" fill="url(#db-assets)"   strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="Net Worth"   stroke="#6c8cff" fill="url(#db-networth)" strokeWidth={2}   dot={false} />
            <Area type="monotone" dataKey="Liabilities" stroke="#f87171" fill="url(#db-liab)"     strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Insights */}
        <Card className="p-6">
          <div className="text-sm font-medium text-white mb-4">Quick Insights</div>
          <div className="flex flex-col gap-3">
            {insights?.fireAge
              ? <Insight icon={<Flame size={15} className="text-[#6c8cff]" />}      text={`You are projected to reach financial independence around age ${insights.fireAge}.`} />
              : <Insight icon={<AlertCircle size={15} className="text-[#facc15]" />} text="Add more events and savings to calculate your FIRE age." />}
            {projection.peakLiability && projection.peakLiability.amount > 0 && (
              <Insight type="warning" icon={<AlertCircle size={15} className="text-[#facc15]" />}
                text={`Peak liability of ${formatCurrency(projection.peakLiability.amount, currency, true)} at age ${Math.round(projection.peakLiability.age)}.`} />
            )}
            {projection.runsOutOfMoney && (
              <Insight type="danger" icon={<AlertCircle size={15} className="text-[#f87171]" />}
                text={`Warning: plan runs out of investments around age ${Math.round(projection.runsOutAtAge ?? 0)}.`} />
            )}
            {retireAge && insights?.fireAge && insights.fireAge > retireAge && (
              <Insight type="warning" icon={<AlertCircle size={15} className="text-[#facc15]" />}
                text={`Projected FIRE age (${insights.fireAge}) is after your retire event (${retireAge}).`} />
            )}
          </div>
        </Card>

        {/* Upcoming events */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-white">Upcoming Events</div>
            <Button variant="ghost" size="sm" onClick={() => setScreen('timeline')}>View all <ArrowRight size={13} /></Button>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-[#7b82aa] text-sm mb-3">No upcoming events yet.</div>
              <Button variant="secondary" size="sm" onClick={() => setScreen('timeline')}>Add your first event</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingEvents.map((event) => {
                const meta = EVENT_META[event.type];
                return (
                  <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#222638]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: meta.bg }}>
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{event.title}</div>
                      <div className="text-xs text-[#7b82aa]">{formatAge(event.startAge)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Insight({ icon, text, type = 'info' }: { icon: React.ReactNode; text: string; type?: 'info' | 'warning' | 'danger' }) {
  const bg = { info: 'bg-[#222638]', warning: 'bg-[#facc151a]', danger: 'bg-[#f871711a]' }[type];
  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg ${bg}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <span className="text-sm text-[#c5c8e8] leading-snug">{text}</span>
    </div>
  );
}
