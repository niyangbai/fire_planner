interface BadgeProps {
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
}

const colors = {
  blue: 'bg-[#6c8cff1a] text-[#6c8cff] border-[#6c8cff33]',
  green: 'bg-[#4ade801a] text-[#4ade80] border-[#4ade8033]',
  yellow: 'bg-[#facc151a] text-[#facc15] border-[#facc1533]',
  red: 'bg-[#f871711a] text-[#f87171] border-[#f8717133]',
  purple: 'bg-[#a78bfa1a] text-[#a78bfa] border-[#a78bfa33]',
  gray: 'bg-[#7b82aa1a] text-[#7b82aa] border-[#7b82aa33]',
};

export default function Badge({ children, color = 'blue' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
}
