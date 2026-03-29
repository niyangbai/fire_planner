import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export default function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-[#7b82aa] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          {...props}
          className={`w-full bg-[#222638] border border-[#2d3148] rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#6c8cff] transition-colors pr-9 ${className}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b82aa] pointer-events-none" />
      </div>
    </div>
  );
}
