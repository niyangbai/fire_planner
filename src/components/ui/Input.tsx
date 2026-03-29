import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
}

export default function Input({ label, error, prefix, suffix, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-[#7b82aa] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-[#7b82aa] text-sm pointer-events-none">{prefix}</span>
        )}
        <input
          {...props}
          className={`w-full bg-[#222638] border border-[#2d3148] rounded-lg px-3 py-2 text-sm text-white placeholder-[#404672] focus:outline-none focus:border-[#6c8cff] transition-colors ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-10' : ''} ${className}`}
        />
        {suffix && (
          <span className="absolute right-3 text-[#7b82aa] text-sm pointer-events-none">{suffix}</span>
        )}
      </div>
      {error && <span className="text-xs text-[#f87171]">{error}</span>}
    </div>
  );
}
