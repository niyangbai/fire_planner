import type { ReactNode } from 'react';
import Card from './Card';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  /** Highlight the value in accent blue */
  accent?: boolean;
  /** Color the value explicitly (overrides accent) */
  valueColor?: 'green' | 'yellow' | 'red';
  icon?: ReactNode;
}

const VALUE_COLORS = {
  green:  'text-[#4ade80]',
  yellow: 'text-[#facc15]',
  red:    'text-[#f87171]',
};

export default function StatCard({ label, value, sub, accent, valueColor, icon }: StatCardProps) {
  const color = valueColor
    ? VALUE_COLORS[valueColor]
    : accent
    ? 'text-[#6c8cff]'
    : 'text-white';

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs text-[#7b82aa] font-medium uppercase tracking-wider">{label}</div>
        {icon && <div className={accent ? 'text-[#6c8cff]' : 'text-[#7b82aa]'}>{icon}</div>}
      </div>
      <div className={`text-2xl font-semibold tracking-tight ${color}`}>{value}</div>
      {sub && <div className="text-xs text-[#7b82aa] mt-1">{sub}</div>}
    </Card>
  );
}
