import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Pencil, Trash2, RotateCcw, TrendingUp, Activity, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  Legend,
} from 'recharts';
import { usePlanStore } from '../store/planStore';
import type { AssetClass } from '../types/plan';
import { DEFAULT_PORTFOLIO } from '../types/plan';
import { portfolioWeightedReturn } from '../engine/projection';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#6c8cff', '#a78bfa', '#4ade80', '#f59e0b', '#f87171',
  '#38bdf8', '#fb923c', '#10b981', '#ec4899', '#7b82aa',
];

// ── Portfolio math ─────────────────────────────────────────────────────────────

// wVol is display-only (simple weighted avg; not used by the engine).
function wVol(assets: AssetClass[]): number {
  const total = assets.reduce((s, a) => s + a.allocation, 0);
  if (total === 0) return 0;
  return assets.reduce((s, a) => s + (a.allocation / total) * a.volatility, 0);
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface PctPayload { name: string; value: number; color: string }
interface PctTooltipProps { active?: boolean; payload?: PctPayload[]; label?: string }

function PctTooltip({ active, payload, label }: PctTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1d27] border border-[#2d3148] rounded-xl p-3 shadow-xl text-xs">
      {label && <div className="font-medium text-white mb-2">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-[#7b82aa]">{p.name}</span>
          </div>
          <span className="font-medium text-white">{p.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Edit form ─────────────────────────────────────────────────────────────────

interface AssetFormState {
  name: string;
  allocation: string;
  expectedReturn: string;
  volatility: string;
  color: string;
}

const BLANK_FORM: AssetFormState = {
  name: '',
  allocation: '10',
  expectedReturn: '7',
  volatility: '15',
  color: '#6c8cff',
};

interface EditFormProps {
  form: AssetFormState;
  setForm: (f: AssetFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew?: boolean;
}

function AssetEditForm({ form, setForm, onSave, onCancel, isNew }: EditFormProps) {
  function field(key: keyof AssetFormState, val: string) {
    setForm({ ...form, [key]: val });
  }
  return (
    <div className="bg-[#1a1d27] border border-[#6c8cff44] rounded-xl p-4">
      <div className="text-xs font-semibold text-[#6c8cff] mb-3 uppercase tracking-wider">
        {isNew ? 'New Asset Class' : 'Edit Asset Class'}
      </div>
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => field('name', e.target.value)}
          placeholder="e.g. US Stocks"
        />
        <Input
          label="Allocation %"
          type="number"
          value={form.allocation}
          onChange={(e) => field('allocation', e.target.value)}
          suffix="%"
        />
        <Input
          label="Expected Return"
          type="number"
          value={form.expectedReturn}
          onChange={(e) => field('expectedReturn', e.target.value)}
          suffix="% / yr"
        />
        <Input
          label="Volatility (Std Dev)"
          type="number"
          value={form.volatility}
          onChange={(e) => field('volatility', e.target.value)}
          suffix="%"
        />
      </div>
      <div className="mb-4">
        <div className="text-xs text-[#7b82aa] font-medium uppercase tracking-wider mb-2">Color</div>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => field('color', c)}
              className={`w-6 h-6 rounded-full transition-transform ${
                form.color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onSave}>{isNew ? 'Add' : 'Save'}</Button>
      </div>
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function Investments() {
  const { plan, updatePortfolio } = usePlanStore();
  const assets = plan.portfolio;

  const [editId, setEditId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<AssetFormState>(BLANK_FORM);

  const total = assets.reduce((s, a) => s + a.allocation, 0);
  const ret = portfolioWeightedReturn(assets) ?? 0;
  const vol = wVol(assets);

  function startEdit(a: AssetClass) {
    setIsAdding(false);
    setEditId(a.id);
    setForm({
      name: a.name,
      allocation: String(a.allocation),
      expectedReturn: String(a.expectedReturn),
      volatility: String(a.volatility),
      color: a.color,
    });
  }

  function startAdd() {
    setEditId(null);
    setForm(BLANK_FORM);
    setIsAdding(true);
  }

  function cancel() {
    setEditId(null);
    setIsAdding(false);
  }

  function saveEdit() {
    if (!editId) return;
    updatePortfolio(
      assets.map((a) =>
        a.id === editId
          ? {
              ...a,
              name: form.name || a.name,
              allocation: Number(form.allocation) || 0,
              expectedReturn: Number(form.expectedReturn) || 0,
              volatility: Number(form.volatility) || 0,
              color: form.color,
            }
          : a,
      ),
    );
    setEditId(null);
  }

  function saveAdd() {
    updatePortfolio([
      ...assets,
      {
        id: uuidv4(),
        name: form.name || 'New Asset',
        allocation: Number(form.allocation) || 0,
        expectedReturn: Number(form.expectedReturn) || 0,
        volatility: Number(form.volatility) || 0,
        color: form.color,
      },
    ]);
    setIsAdding(false);
  }

  function deleteAsset(id: string) {
    updatePortfolio(assets.filter((a) => a.id !== id));
  }

  function resetToDefaults() {
    updatePortfolio(DEFAULT_PORTFOLIO.map((a) => ({ ...a })));
    setEditId(null);
    setIsAdding(false);
  }

  // Chart data
  const allocData = assets.map((a) => ({
    name: a.name,
    Allocation: a.allocation,
    color: a.color,
  }));

  const riskReturnData = assets.map((a) => ({
    name: a.name.split(' ')[0],
    'Exp. Return': Number(a.expectedReturn.toFixed(1)),
    Volatility: Number(a.volatility.toFixed(1)),
  }));

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Investments"
        subtitle="Define your portfolio allocation and expected returns. The engine uses these to project growth."
        action={
          <Button variant="primary" onClick={startAdd}>
            <Plus size={15} /> Add Asset Class
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Weighted Return"
          value={`${ret.toFixed(1)}%`}
          sub="Annual portfolio-blended rate"
          valueColor="green"
          icon={<TrendingUp size={15} />}
        />
        <StatCard
          label="Portfolio Risk"
          value={`±${vol.toFixed(1)}%`}
          sub="Weighted avg volatility"
          icon={<Activity size={15} />}
        />
        <StatCard
          label="Total Allocated"
          value={`${Math.round(total)}%`}
          sub={
            total === 100
              ? 'Fully allocated'
              : total < 100
              ? `${Math.round(100 - total)}% remaining`
              : `${Math.round(total - 100)}% over-allocated`
          }
          valueColor={total === 100 ? 'green' : 'yellow'}
        />
      </div>

      {total !== 100 && (
        <div className="flex items-center gap-2 text-xs text-[#facc15] bg-[#facc1510] border border-[#facc1530] rounded-lg px-4 py-3 mb-6">
          <AlertCircle size={13} className="shrink-0" />
          Allocations must sum to 100% for accurate projections. Currently at {Math.round(total)}%.
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <div className="text-sm font-medium text-white mb-1">Allocation Breakdown</div>
          <div className="text-xs text-[#7b82aa] mb-5">How your investments are distributed</div>
          <ResponsiveContainer width="100%" height={Math.max(160, assets.length * 44)}>
            <BarChart data={allocData} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: '#7b82aa', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#7b82aa', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={95}
              />
              <Tooltip content={<PctTooltip />} />
              <Bar dataKey="Allocation" radius={[0, 4, 4, 0]}>
                {allocData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="Allocation"
                  position="right"
                  formatter={(v: unknown) => `${v}%`}
                  style={{ fill: '#7b82aa', fontSize: 11 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-white mb-1">Return vs Risk</div>
          <div className="text-xs text-[#7b82aa] mb-5">Expected return and volatility per asset class</div>
          <ResponsiveContainer width="100%" height={Math.max(160, assets.length * 44)}>
            <BarChart data={riskReturnData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: '#7b82aa', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#7b82aa', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
                width={40}
              />
              <Tooltip content={<PctTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#7b82aa', paddingTop: 8 }}
              />
              <Bar dataKey="Exp. Return" fill="#4ade80" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Volatility" fill="#f87171" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Asset class table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="text-sm font-medium text-white">Asset Classes</div>
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 text-xs text-[#7b82aa] hover:text-white transition-colors"
          >
            <RotateCcw size={12} /> Reset to defaults
          </button>
        </div>

        {/* Column headers */}
        <div className="mb-2 hidden grid-cols-[1fr_80px_120px_110px_64px] gap-3 px-3 text-[10px] font-medium uppercase tracking-wider text-[#7b82aa] lg:grid">
          <span>Asset Class</span>
          <span className="text-right">Alloc.</span>
          <span className="text-right">Exp. Return</span>
          <span className="text-right">Volatility</span>
          <span />
        </div>

        <div className="flex flex-col gap-2">
          {assets.map((a) =>
            editId === a.id ? (
              <AssetEditForm
                key={a.id}
                form={form}
                setForm={setForm}
                onSave={saveEdit}
                onCancel={cancel}
              />
            ) : (
              <div key={a.id} className="rounded-lg bg-[#222638] px-3 py-3">
                <div className="hidden items-center gap-3 lg:grid lg:grid-cols-[1fr_80px_120px_110px_64px]">
                  <div className="flex items-center gap-2.5">
                    <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: a.color }} />
                    <span className="text-sm text-white">{a.name}</span>
                  </div>
                  <span className="text-right text-sm font-semibold" style={{ color: a.color }}>
                    {a.allocation}%
                  </span>
                  <span className="text-right text-sm text-[#4ade80]">{a.expectedReturn.toFixed(1)}% / yr</span>
                  <span className="text-right text-sm text-[#f87171]">±{a.volatility.toFixed(1)}%</span>
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => startEdit(a)}
                      className="rounded-lg p-1.5 text-[#7b82aa] transition-colors hover:bg-[#2d3148] hover:text-white"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => deleteAsset(a.id)}
                      className="rounded-lg p-1.5 text-[#7b82aa] transition-colors hover:bg-[#f871711a] hover:text-[#f87171]"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-3 lg:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: a.color }} />
                      <span className="text-sm text-white">{a.name}</span>
                    </div>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => startEdit(a)}
                        className="rounded-lg p-1.5 text-[#7b82aa] transition-colors hover:bg-[#2d3148] hover:text-white"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteAsset(a.id)}
                        className="rounded-lg p-1.5 text-[#7b82aa] transition-colors hover:bg-[#f871711a] hover:text-[#f87171]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
                    <div>
                      <div className="text-[#7b82aa]">Alloc.</div>
                      <div className="font-semibold" style={{ color: a.color }}>{a.allocation}%</div>
                    </div>
                    <div>
                      <div className="text-[#7b82aa]">Return</div>
                      <div className="text-[#4ade80]">{a.expectedReturn.toFixed(1)}% / yr</div>
                    </div>
                    <div>
                      <div className="text-[#7b82aa]">Risk</div>
                      <div className="text-[#f87171]">±{a.volatility.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              </div>
            ),
          )}

          {/* Totals row */}
          {assets.length > 0 && (
            <div className="mt-1 hidden grid-cols-[1fr_80px_120px_110px_64px] items-center gap-3 border-t border-[#2d3148] px-3 py-2 lg:grid">
              <span className="text-xs text-[#7b82aa]">Portfolio Total</span>
              <span
                className={`text-sm text-right font-semibold ${
                  total === 100 ? 'text-[#4ade80]' : 'text-[#facc15]'
                }`}
              >
                {Math.round(total)}%
              </span>
              <span className="text-sm text-right text-[#4ade80] font-semibold">{ret.toFixed(1)}% / yr</span>
              <span className="text-sm text-right text-[#f87171] font-semibold">±{vol.toFixed(1)}%</span>
              <span />
            </div>
          )}

          {assets.length > 0 && (
            <div className="mt-1 flex items-center justify-between border-t border-[#2d3148] px-1 py-3 text-sm lg:hidden">
              <span className="text-[#7b82aa]">Portfolio Total</span>
              <div className="flex flex-col items-end">
                <span className={total === 100 ? 'font-semibold text-[#4ade80]' : 'font-semibold text-[#facc15]'}>
                  {Math.round(total)}%
                </span>
                <span className="text-xs text-[#7b82aa]">{ret.toFixed(1)}% / yr · ±{vol.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Add form */}
          {isAdding && (
            <div className="mt-2">
              <AssetEditForm
                form={form}
                setForm={setForm}
                onSave={saveAdd}
                onCancel={cancel}
                isNew
              />
            </div>
          )}

          {assets.length === 0 && !isAdding && (
            <div className="text-sm text-[#7b82aa] text-center py-8">
              No asset classes. Add one or reset to defaults.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
