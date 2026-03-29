interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-[#1a1d27] border border-[#2d3148] rounded-xl ${onClick ? 'cursor-pointer hover:border-[#404672] transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
