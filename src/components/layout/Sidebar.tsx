import {
  LayoutDashboard,
  CalendarDays,
  Target,
  TrendingUp,
  PieChart,
  Database,
  Settings,
  Flame,
  ExternalLink,
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

const REPO_URL = 'https://github.com/niyangbai/fire_planner';

export default function Sidebar() {
  const { activeScreen, setScreen, plan, lastSaved } = usePlanStore();

  return (
    <>
      <aside className="sticky top-0 z-30 border-b border-[#2d3148] bg-[#0f1117] md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6c8cff] to-[#a78bfa]">
              <Flame size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight text-white">FIRE Planner</div>
              <div className="truncate text-[10px] leading-tight text-[#7b82aa]">{plan.name}</div>
            </div>
          </div>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Open GitHub repository"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#2d3148] text-[#7b82aa] transition-colors hover:border-[#404672] hover:text-white"
          >
            <ExternalLink size={15} />
          </a>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs transition-all ${
                activeScreen === item.id
                  ? 'border-[#6c8cff] bg-[#1e2235] font-medium text-white'
                  : 'border-[#2d3148] text-[#7b82aa]'
              }`}
            >
              <span className={activeScreen === item.id ? 'text-[#6c8cff]' : ''}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 pb-3 text-[10px] text-[#7b82aa]">
          {lastSaved ? `Saved ${formatRelativeTime(lastSaved)}` : 'Not yet saved'}
        </div>
      </aside>

      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-[#2d3148] bg-[#0f1117] md:flex md:flex-col">
        <div className="flex items-center gap-2.5 border-b border-[#2d3148] px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6c8cff] to-[#a78bfa]">
            <Flame size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight text-white">FIRE Planner</div>
            <div className="text-[10px] leading-tight text-[#7b82aa]">Event-Driven</div>
          </div>
        </div>
        <div className="border-b border-[#2d3148] px-5 py-3">
          <div className="mb-0.5 text-xs text-[#7b82aa]">Current Plan</div>
          <div className="truncate text-sm font-medium text-white">{plan.name}</div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                activeScreen === item.id
                  ? 'bg-[#1e2235] font-medium text-white'
                  : 'text-[#7b82aa] hover:bg-[#1a1d27] hover:text-white'
              }`}
            >
              <span className={activeScreen === item.id ? 'text-[#6c8cff]' : ''}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-[#2d3148] px-5 py-4">
          <div className="flex items-end justify-between gap-3">
            <div className="text-[10px] text-[#7b82aa]">
              {lastSaved ? `Saved ${formatRelativeTime(lastSaved)}` : 'Not yet saved'}
            </div>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Open GitHub repository"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#2d3148] text-[#7b82aa] transition-colors hover:border-[#404672] hover:text-white"
            >
              <ExternalLink size={15} />
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
