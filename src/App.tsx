import { usePlanStore } from './store/planStore';
import Sidebar from './components/layout/Sidebar';
import Onboarding from './components/Onboarding';
import Dashboard from './screens/Dashboard';
import Timeline from './screens/Timeline';
import Lifeline from './screens/Lifeline';
import Projection from './screens/Projection';
import Investments from './screens/Investments';
import PlanData from './screens/PlanData';
import Settings from './screens/Settings';

function ScreenContent() {
  const { activeScreen } = usePlanStore();
  switch (activeScreen) {
    case 'dashboard': return <Dashboard />;
    case 'timeline': return <Timeline />;
    case 'lifeline': return <Lifeline />;
    case 'investments': return <Investments />;
    case 'projection': return <Projection />;
    case 'data': return <PlanData />;
    case 'settings': return <Settings />;
    default: return <Dashboard />;
  }
}

export default function App() {
  const { isOnboarding } = usePlanStore();

  return (
    <div className="flex min-h-screen flex-col bg-[#0f1117] md:h-screen md:flex-row md:overflow-hidden">
      {isOnboarding && <Onboarding />}
      <Sidebar />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <ScreenContent />
      </main>
    </div>
  );
}
