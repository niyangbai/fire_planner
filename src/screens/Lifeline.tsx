import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Pencil, Trash2, Target, CheckCircle, XCircle } from 'lucide-react';
import { usePlanStore } from '../store/planStore';
import type { LifelineCheckpoint } from '../types/plan';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { formatCurrency } from '../utils/format';

// ── Checkpoint Form ───────────────────────────────────────────────────────────

interface CheckpointFormProps {
  existing?: LifelineCheckpoint;
  onSave: (c: LifelineCheckpoint) => void;
  onCancel: () => void;
  currentAge: number;
}

function CheckpointForm({ existing, onSave, onCancel, currentAge }: CheckpointFormProps) {
  const [age, setAge] = useState(String(existing?.age ?? currentAge + 10));
  const [title, setTitle] = useState(existing?.title ?? '');
  const [targetNetWorth, setTargetNetWorth] = useState(String(existing?.targetNetWorth ?? ''));
  const [targetAssets, setTargetAssets] = useState(String(existing?.targetAssets ?? ''));
  const [targetLiabilities, setTargetLiabilities] = useState(String(existing?.targetLiabilities ?? ''));
  const [targetMonthlySpending, setTargetMonthlySpending] = useState(String(existing?.targetMonthlySpending ?? ''));
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState('');

  function handleSave() {
    if (!targetNetWorth && !targetAssets && !targetLiabilities && !targetMonthlySpending) {
      setError('Provide at least one financial target.');
      return;
    }
    onSave({
      id: existing?.id ?? uuidv4(),
      age: Number(age) || currentAge + 10,
      title: title || `Checkpoint at age ${age}`,
      targetNetWorth: targetNetWorth ? Number(targetNetWorth) : undefined,
      targetAssets: targetAssets ? Number(targetAssets) : undefined,
      targetLiabilities: targetLiabilities ? Number(targetLiabilities) : undefined,
      targetMonthlySpending: targetMonthlySpending ? Number(targetMonthlySpending) : undefined,
      note: note || undefined,
    });
  }

  return (
    <div className="bg-[#1a1d27] border border-[#6c8cff44] rounded-xl p-5 flex flex-col gap-4">
      <div className="text-sm font-semibold text-white">{existing ? 'Edit Checkpoint' : 'New Checkpoint'}</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Age" type="number" value={age} onChange={(e) => setAge(e.target.value)} suffix="yrs" />
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Checkpoint label" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Target Net Worth" type="number" value={targetNetWorth} onChange={(e) => setTargetNetWorth(e.target.value)} prefix="$" />
        <Input label="Target Assets" type="number" value={targetAssets} onChange={(e) => setTargetAssets(e.target.value)} prefix="$" />
        <Input label="Target Liabilities (max)" type="number" value={targetLiabilities} onChange={(e) => setTargetLiabilities(e.target.value)} prefix="$" />
        <Input label="Target Monthly Spending" type="number" value={targetMonthlySpending} onChange={(e) => setTargetMonthlySpending(e.target.value)} prefix="$" />
      </div>

      <Textarea label="Note" value={note} onChange={(e) => setNote(e.target.value)} />

      {error && <div className="text-xs text-[#f87171]">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>
          {existing ? 'Save Changes' : 'Add Checkpoint'}
        </Button>
      </div>
    </div>
  );
}

// ── Checkpoint Card ───────────────────────────────────────────────────────────

interface CheckpointCardProps {
  checkpoint: LifelineCheckpoint;
  projectedNetWorth: number | undefined;
  projectedAssets: number | undefined;
  projectedLiabilities: number | undefined;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}

function statusIcon(projected: number | undefined, target: number, lowerIsBetter = false) {
  if (projected === undefined) return null;
  const passes = lowerIsBetter ? projected <= target : projected >= target;
  return passes
    ? <CheckCircle size={14} className="text-[#4ade80] shrink-0" />
    : <XCircle size={14} className="text-[#f87171] shrink-0" />;
}

function CheckpointCard({ checkpoint, projectedNetWorth, projectedAssets, projectedLiabilities, currency, onEdit, onDelete }: CheckpointCardProps) {
  const items: { label: string; target: number; projected: number | undefined; lowerIsBetter?: boolean }[] = [];

  if (checkpoint.targetNetWorth !== undefined)
    items.push({ label: 'Net Worth', target: checkpoint.targetNetWorth, projected: projectedNetWorth });
  if (checkpoint.targetAssets !== undefined)
    items.push({ label: 'Total Assets', target: checkpoint.targetAssets, projected: projectedAssets });
  if (checkpoint.targetLiabilities !== undefined)
    items.push({ label: 'Liabilities (max)', target: checkpoint.targetLiabilities, projected: projectedLiabilities, lowerIsBetter: true });

  const allPass = items.length > 0 && items.every((item) => {
    if (item.projected === undefined) return false;
    return item.lowerIsBetter ? item.projected <= item.target : item.projected >= item.target;
  });

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${allPass ? 'bg-[#4ade8018] text-[#4ade80]' : 'bg-[#6c8cff18] text-[#6c8cff]'}`}>
            {checkpoint.age}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{checkpoint.title}</div>
            <div className="text-xs text-[#7b82aa]">Age {checkpoint.age} checkpoint</div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1.5 text-[#7b82aa] hover:text-white hover:bg-[#222638] rounded-lg transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-[#7b82aa] hover:text-[#f87171] hover:bg-[#f871711a] rounded-lg transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {items.map((item) => {
            const passes = item.projected !== undefined && (item.lowerIsBetter ? item.projected <= item.target : item.projected >= item.target);
            const variance = item.projected !== undefined ? item.projected - item.target : undefined;
            return (
              <div key={item.label} className="flex items-center justify-between bg-[#222638] rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  {statusIcon(item.projected, item.target, item.lowerIsBetter)}
                  <span className="text-xs text-[#7b82aa]">{item.label}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white font-medium">
                    Target: {formatCurrency(item.target, currency)}
                  </div>
                  {item.projected !== undefined && (
                    <div className={`text-xs ${passes ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                      Projected: {formatCurrency(item.projected, currency)}
                      {variance !== undefined && (
                        <span className="ml-1">({variance >= 0 ? '+' : ''}{formatCurrency(variance, currency)})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {checkpoint.targetMonthlySpending !== undefined && (
        <div className="text-xs text-[#7b82aa] bg-[#222638] rounded-lg px-3 py-2">
          Monthly spending target: {formatCurrency(checkpoint.targetMonthlySpending, currency)}/mo
        </div>
      )}

      {checkpoint.note && (
        <div className="text-xs text-[#7b82aa] italic mt-2">{checkpoint.note}</div>
      )}
    </Card>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function Lifeline() {
  const { plan, projection, addCheckpoint, updateCheckpoint, deleteCheckpoint } = usePlanStore();
  const { lifelineCheckpoints, profile, settings } = plan;

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sorted = [...lifelineCheckpoints].sort((a, b) => a.age - b.age);

  function getProjectedAt(age: number) {
    const snap = projection?.annual.find((s) => s.age >= age);
    return snap;
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Lifeline"
        subtitle="Set target checkpoints for your financial journey."
        action={
          <Button variant="primary" onClick={() => setIsAdding(true)}>
            <Plus size={15} /> Add Checkpoint
          </Button>
        }
      />

      {isAdding && (
        <div className="mb-6">
          <CheckpointForm
            currentAge={profile.currentAge}
            onSave={(c) => { addCheckpoint(c); setIsAdding(false); }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {sorted.length === 0 && !isAdding ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1a1d27] border border-[#2d3148] flex items-center justify-center mb-4">
            <Target size={28} className="text-[#404672]" />
          </div>
          <div className="text-white font-medium mb-2">No checkpoints yet</div>
          <div className="text-sm text-[#7b82aa] max-w-xs mb-6">
            Set a checkpoint for where you want to be — by age 40, have $500K net worth.
          </div>
          <Button variant="primary" onClick={() => setIsAdding(true)}>
            <Plus size={15} /> Set your first checkpoint
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map((checkpoint) => {
            const snap = getProjectedAt(checkpoint.age);
            if (editingId === checkpoint.id) {
              return (
                <CheckpointForm
                  key={checkpoint.id}
                  existing={checkpoint}
                  currentAge={profile.currentAge}
                  onSave={(c) => { updateCheckpoint(c); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                />
              );
            }
            return (
              <CheckpointCard
                key={checkpoint.id}
                checkpoint={checkpoint}
                projectedNetWorth={snap?.netWorth}
                projectedAssets={snap?.totalAssets}
                projectedLiabilities={snap?.totalLiabilities}
                currency={settings.currency}
                onEdit={() => setEditingId(checkpoint.id)}
                onDelete={() => deleteCheckpoint(checkpoint.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
