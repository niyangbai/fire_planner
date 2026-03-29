import {
  LayoutDashboard,
  CalendarDays,
  Target,
  TrendingUp,
  PieChart,
  Database,
  Settings,
  Flame,
} from 'lucide-react';
import type { Screen } from '../../store/planStore';
import { usePlanStore } from '../../store/planStore';
import { formatRelativeTime } from '../../utils/format';

const NAV_ITEMS: { id: Screen; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'timeline', label: 'Timeline', icon: <CalendarDays size={18} /> },
  { id: 'lifeline', label: 'Lifeline', icon: <Target size={18} /> },
  { id: 'investments', label: 'Investments', icon: <PieChart size={18} /> },
  { id: 'projection', label: 'Projection', icon: <TrendingUp size={18} /> },
  { id: 'data', label: 'Plan Data', icon: <Database size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

export default function Sidebar() {
  const { activeScreen, setScreen, plan, lastSaved } = usePlanStore();

  return (
    <aside className="flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r border-[#2d3148] bg-[#0f1117]">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-[#2d3148]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c8cff] to-[#a78bfa] flex items-center justify-center">
          <Flame size={16} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white leading-tight">FIRE Planner</div>
          <div className="text-[10px] text-[#7b82aa] leading-tight">Event-Driven</div>
        </div>
      </div>

      {/* Plan name */}
      <div className="px-5 py-3 border-b border-[#2d3148]">
        <div className="text-xs text-[#7b82aa] mb-0.5">Current Plan</div>
        <div className="text-sm font-medium text-white truncate">{plan.name}</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-all ${
              activeScreen === item.id
                ? 'bg-[#1e2235] text-white font-medium'
                : 'text-[#7b82aa] hover:text-white hover:bg-[#1a1d27]'
            }`}
          >
            <span className={activeScreen === item.id ? 'text-[#6c8cff]' : ''}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Save status */}
      <div className="px-5 py-4 border-t border-[#2d3148]">
        <div className="text-[10px] text-[#7b82aa]">
          {lastSaved ? `Saved ${formatRelativeTime(lastSaved)}` : 'Not yet saved'}
        </div>
      </div>
    </aside>
  );
}
