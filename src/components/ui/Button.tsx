import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const variants = {
  primary: 'bg-[#6c8cff] hover:bg-[#5a7aee] text-white',
  secondary: 'bg-[#222638] hover:bg-[#2d3148] text-white border border-[#2d3148]',
  ghost: 'text-[#7b82aa] hover:text-white hover:bg-[#1a1d27]',
  danger: 'text-[#f87171] hover:bg-[#f871711a]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-sm rounded-xl',
};

export default function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled,
  type = 'button',
  className = '',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 font-medium transition-all ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
