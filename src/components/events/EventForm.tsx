import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X } from 'lucide-react';
import type { PlanEvent, EventType } from '../../types/plan';
import { usePlanStore } from '../../store/planStore';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';

// ── Event type selector options ───────────────────────────────────────────────

const TYPE_OPTIONS: { value: EventType; label: string; group: string }[] = [
  // Income
  { value: 'job_income',          label: '💰 Job Income',            group: 'Income' },
  { value: 'annual_bonus',        label: '🎁 Annual Bonus',          group: 'Income' },
  { value: 'side_income',         label: '💼 Side Income',           group: 'Income' },
  { value: 'lump_sum_income',     label: '💵 Lump Sum Income',       group: 'Income' },
  // Expenses
  { value: 'expense_change',      label: '🏠 Living Expenses',       group: 'Expense' },
  { value: 'recurring_expense',   label: '🔄 Recurring Expense',     group: 'Expense' },
  { value: 'lump_sum_expense',    label: '💸 Lump Sum Expense',      group: 'Expense' },
  // Real Estate
  { value: 'buy_property',        label: '🏡 Buy Property',          group: 'Real Estate' },
  { value: 'sell_property',       label: '🔑 Sell Property',         group: 'Real Estate' },
  // Investments
  { value: 'contribution_change', label: '📈 Monthly Contribution',  group: 'Investment' },
  { value: 'lump_sum_investment', label: '💎 Lump Sum Investment',   group: 'Investment' },
  // Life
  { value: 'retire',              label: '🌅 Retire',                group: 'Life' },
];

// Event types that support an optional end age
const HAS_END_AGE: EventType[] = ['annual_bonus', 'side_income', 'recurring_expense'];

// Event types with a single "monthly amount" field
const HAS_MONTHLY: EventType[] = ['job_income', 'side_income', 'recurring_expense', 'contribution_change', 'expense_change'];

// Event types with a single "amount" field (one-time)
const HAS_AMOUNT: EventType[] = ['lump_sum_income', 'lump_sum_expense', 'lump_sum_investment'];

// ── Props ─────────────────────────────────────────────────────────────────────

interface EventFormProps {
  initialType?: EventType;
  existingEvent?: PlanEvent;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventForm({ initialType = 'job_income', existingEvent, onClose }: EventFormProps) {
  const { addEvent, updateEvent, plan } = usePlanStore();
  const isEdit = !!existingEvent;

  function getField<K extends string>(key: K): string {
    if (!existingEvent) return '';
    return String((existingEvent as unknown as Record<string, unknown>)[key] ?? '');
  }

  const [type, setType] = useState<EventType>(existingEvent?.type ?? initialType);
  const [startAge, setStartAge] = useState(getField('startAge') || String(plan.profile.currentAge + 5));
  const [endAge, setEndAge]     = useState(getField('endAge'));
  const [title, setTitle]       = useState(existingEvent?.title ?? '');
  const [note, setNote]         = useState(existingEvent?.note ?? '');

  const [monthlyAmount,         setMonthlyAmount]         = useState(getField('monthlyAmount'));
  const [annualAmount,          setAnnualAmount]          = useState(getField('annualAmount'));
  const [amount,                setAmount]                = useState(getField('amount'));
  const [purchasePrice,         setPurchasePrice]         = useState(getField('purchasePrice'));
  const [downPayment,           setDownPayment]           = useState(getField('downPayment'));
  const [mortgageRate,          setMortgageRate]          = useState(getField('mortgageRate'));
  const [mortgageTerm,          setMortgageTerm]          = useState(getField('mortgageTerm'));
  const [salePrice,             setSalePrice]             = useState(getField('salePrice'));
  const [sellingCost,           setSellingCost]           = useState(getField('sellingCost'));
  const [targetMonthlySpending, setTargetMonthlySpending] = useState(getField('targetMonthlySpending'));

  const [errors, setErrors] = useState<Record<string, string>>({});

  const buyPropertyEvents = plan.events.filter((e) => e.type === 'buy_property');

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const sa = Number(startAge);
    if (!sa || sa < plan.profile.currentAge) {
      errs.startAge = `Must be ≥ current age (${plan.profile.currentAge})`;
    }
    if (endAge && Number(endAge) <= sa) {
      errs.endAge = 'End age must be after start age';
    }
    if (type === 'buy_property') {
      if (Number(downPayment) >= Number(purchasePrice)) errs.downPayment = 'Must be less than purchase price';
      if (Number(mortgageTerm) <= 0) errs.mortgageTerm = 'Must be positive';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Build typed event ───────────────────────────────────────────────────────

  function buildEvent(): PlanEvent {
    const meta = TYPE_OPTIONS.find((t) => t.value === type);
    const base = {
      id:       existingEvent?.id ?? uuidv4(),
      type,
      startAge: Number(startAge),
      endAge:   endAge ? Number(endAge) : undefined,
      title:    title || (meta?.label.replace(/^.{2} /, '') ?? type),
      note:     note || undefined,
    };

    switch (type) {
      case 'job_income':
        return { ...base, type, monthlyAmount: Number(monthlyAmount) };
      case 'annual_bonus':
        return { ...base, type, annualAmount: Number(annualAmount) };
      case 'side_income':
        return { ...base, type, monthlyAmount: Number(monthlyAmount) };
      case 'lump_sum_income':
        return { ...base, type, amount: Number(amount) };
      case 'expense_change':
        return { ...base, type, monthlyAmount: Number(monthlyAmount) };
      case 'recurring_expense':
        return { ...base, type, monthlyAmount: Number(monthlyAmount) };
      case 'lump_sum_expense':
        return { ...base, type, amount: Number(amount) };
      case 'buy_property': {
        const propertyId = existingEvent?.type === 'buy_property' ? existingEvent.propertyId : uuidv4();
        return { ...base, type, purchasePrice: Number(purchasePrice), downPayment: Number(downPayment), mortgageRate: Number(mortgageRate), mortgageTerm: Number(mortgageTerm), propertyId };
      }
      case 'sell_property': {
        const propertyId = existingEvent?.type === 'sell_property'
          ? existingEvent.propertyId
          : (buyPropertyEvents[0]?.type === 'buy_property' ? buyPropertyEvents[0].propertyId : '');
        return { ...base, type, salePrice: Number(salePrice), sellingCost: sellingCost ? Number(sellingCost) : undefined, propertyId };
      }
      case 'retire':
        return { ...base, type, targetMonthlySpending: Number(targetMonthlySpending) };
      case 'contribution_change':
        return { ...base, type, monthlyAmount: Number(monthlyAmount) };
      case 'lump_sum_investment':
        return { ...base, type, amount: Number(amount) };
    }
  }

  function handleSubmit() {
    if (!validate()) return;
    const event = buildEvent();
    if (isEdit) updateEvent(event); else addEvent(event);
    onClose();
  }

  const defaultTitle = TYPE_OPTIONS.find((t) => t.value === type)?.label.replace(/^.{2} /, '') ?? '';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2d3148]">
        <div className="text-sm font-semibold text-white">{isEdit ? 'Edit Event' : 'Add Event'}</div>
        <button onClick={onClose} className="text-[#7b82aa] hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        <Select
          label="Event Type"
          value={type}
          onChange={(e) => setType(e.target.value as EventType)}
          options={TYPE_OPTIONS}
          disabled={isEdit}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Start Age" type="number" value={startAge} onChange={(e) => setStartAge(e.target.value)} error={errors.startAge} suffix="yrs" />
          {HAS_END_AGE.includes(type) && (
            <Input label="End Age (optional)" type="number" value={endAge} onChange={(e) => setEndAge(e.target.value)} error={errors.endAge} suffix="yrs" />
          )}
        </div>

        <Input label="Title / Label" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={defaultTitle} />

        {/* Monthly amount (income / expense / contribution) */}
        {HAS_MONTHLY.includes(type) && (
          <Input
            label={type === 'expense_change' ? 'New Monthly Spending' : 'Monthly Amount'}
            type="number" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} prefix="$"
          />
        )}

        {/* Annual bonus */}
        {type === 'annual_bonus' && (
          <Input label="Annual Amount" type="number" value={annualAmount} onChange={(e) => setAnnualAmount(e.target.value)} prefix="$" />
        )}

        {/* One-time amount */}
        {HAS_AMOUNT.includes(type) && (
          <Input label="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} prefix="$" />
        )}

        {/* Retire */}
        {type === 'retire' && (
          <Input label="Target Monthly Spending in Retirement" type="number" value={targetMonthlySpending} onChange={(e) => setTargetMonthlySpending(e.target.value)} prefix="$" />
        )}

        {/* Buy property */}
        {type === 'buy_property' && (
          <>
            <Input label="Purchase Price"  type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} prefix="$" />
            <Input label="Down Payment"    type="number" value={downPayment}   onChange={(e) => setDownPayment(e.target.value)}   prefix="$" error={errors.downPayment} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Mortgage Rate" type="number" value={mortgageRate}  onChange={(e) => setMortgageRate(e.target.value)}  suffix="% /yr" />
              <Input label="Term"          type="number" value={mortgageTerm}  onChange={(e) => setMortgageTerm(e.target.value)}  suffix="years" error={errors.mortgageTerm} />
            </div>
          </>
        )}

        {/* Sell property */}
        {type === 'sell_property' && (
          <>
            <Input label="Sale Price"               type="number" value={salePrice}   onChange={(e) => setSalePrice(e.target.value)}   prefix="$" />
            <Input label="Selling Costs (optional)" type="number" value={sellingCost} onChange={(e) => setSellingCost(e.target.value)} prefix="$" />
          </>
        )}

        <Textarea label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add context or a reminder..." />
      </div>

      <div className="px-5 py-4 border-t border-[#2d3148] flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Add Event'}</Button>
      </div>
    </div>
  );
}
