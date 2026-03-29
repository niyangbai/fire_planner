import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export default function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-[#7b82aa] uppercase tracking-wider">{label}</label>
      )}
      <textarea
        {...props}
        rows={props.rows ?? 2}
        className={`w-full bg-[#222638] border border-[#2d3148] rounded-lg px-3 py-2 text-sm text-white placeholder-[#404672] focus:outline-none focus:border-[#6c8cff] transition-colors resize-none ${className}`}
      />
    </div>
  );
}
