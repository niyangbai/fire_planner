import { formatCurrency } from '../../utils/format';

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
  currency: string;
}

export default function ChartTooltip({ active, payload, label, currency }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1d27] border border-[#2d3148] rounded-xl p-3 shadow-xl text-xs">
      <div className="font-medium text-white mb-2">Age {label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-[#7b82aa]">{p.name}</span>
          </div>
          <span className="font-medium text-white">{formatCurrency(p.value, currency)}</span>
        </div>
      ))}
    </div>
  );
}
