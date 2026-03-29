import { Settings as SettingsIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { usePlanStore } from '../store/planStore';
import type { GrowthMode } from '../types/plan';
import { GROWTH_RATES } from '../types/plan';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: '$ USD – US Dollar' },
  { value: 'EUR', label: '€ EUR – Euro' },
  { value: 'GBP', label: '£ GBP – British Pound' },
  { value: 'JPY', label: '¥ JPY – Japanese Yen' },
  { value: 'AUD', label: 'A$ AUD – Australian Dollar' },
  { value: 'CAD', label: 'C$ CAD – Canadian Dollar' },
  { value: 'CHF', label: 'Fr CHF – Swiss Franc' },
  { value: 'INR', label: '₹ INR – Indian Rupee' },
  { value: 'SGD', label: 'S$ SGD – Singapore Dollar' },
];

const GROWTH_OPTIONS: { value: GrowthMode; label: string }[] = [
  { value: 'conservative', label: `Conservative (~${GROWTH_RATES.conservative}% /yr)` },
  { value: 'base', label: `Base (~${GROWTH_RATES.base}% /yr)` },
  { value: 'optimistic', label: `Optimistic (~${GROWTH_RATES.optimistic}% /yr)` },
];

export default function Settings() {
  const { plan, updateProfile, updateSettings } = usePlanStore();
  const { profile, settings } = plan;
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Settings & Assumptions"
        subtitle="Configure your projection parameters."
      />

      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Profile Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <SettingsIcon size={15} className="text-[#6c8cff]" />
            <div className="text-sm font-semibold text-white">Profile</div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Current Age"
              type="number"
              value={String(profile.currentAge)}
              onChange={(e) => updateProfile({ currentAge: Number(e.target.value) || profile.currentAge })}
              suffix="yrs"
            />
            <Input
              label="Current Cash"
              type="number"
              value={String(profile.currentCash)}
              onChange={(e) => updateProfile({ currentCash: Number(e.target.value) || 0 })}
              prefix="$"
            />
            <Input
              label="Current Investments"
              type="number"
              value={String(profile.currentInvestments)}
              onChange={(e) => updateProfile({ currentInvestments: Number(e.target.value) || 0 })}
              prefix="$"
            />
          </div>
          <div className="mt-4 bg-[#222638] rounded-lg px-4 py-3 text-xs text-[#7b82aa]">
            💡 Income, expenses, contributions, and retirement age are all events on the Timeline.
          </div>
        </Card>

        {/* Projection Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <SettingsIcon size={15} className="text-[#a78bfa]" />
            <div className="text-sm font-semibold text-white">Projection Settings</div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Currency"
              value={settings.currency}
              onChange={(e) => updateSettings({ currency: e.target.value })}
              options={CURRENCY_OPTIONS}
            />
            <Input
              label="Projection End Age"
              type="number"
              value={String(settings.projectionEndAge)}
              onChange={(e) => updateSettings({ projectionEndAge: Number(e.target.value) || 90 })}
              suffix="yrs"
            />
            <Select
              label="Investment Growth Mode"
              value={settings.investmentGrowthMode}
              onChange={(e) => updateSettings({ investmentGrowthMode: e.target.value as GrowthMode })}
              options={GROWTH_OPTIONS}
            />
            <Input
              label="Withdrawal Rate (FIRE rule)"
              type="number"
              value={String(settings.withdrawalRate)}
              onChange={(e) => updateSettings({ withdrawalRate: Number(e.target.value) || 4 })}
              suffix="% /yr"
            />
          </div>
        </Card>

        {/* Advanced Settings (hidden) */}
        <Card className="p-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-sm font-semibold text-white"
          >
            <span>Advanced Settings</span>
            {showAdvanced ? <ChevronUp size={16} className="text-[#7b82aa]" /> : <ChevronDown size={16} className="text-[#7b82aa]" />}
          </button>

          {showAdvanced && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Custom Growth Rate (overrides mode)"
                type="number"
                value={String(settings.customAnnualGrowthRate ?? '')}
                onChange={(e) => updateSettings({ customAnnualGrowthRate: e.target.value ? Number(e.target.value) : undefined })}
                suffix="% /yr"
                placeholder="Optional"
              />
              <Input
                label="Inflation Rate"
                type="number"
                value={String(settings.inflationRate)}
                onChange={(e) => updateSettings({ inflationRate: Number(e.target.value) || 2 })}
                suffix="% /yr"
              />
              <div className="col-span-2">
                <div className="flex items-center justify-between bg-[#222638] rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm text-white">Monte Carlo Simulation</div>
                    <div className="text-xs text-[#7b82aa] mt-0.5">Run probabilistic projections (experimental)</div>
                  </div>
                  <button
                    onClick={() => updateSettings({ enableMonteCarlo: !settings.enableMonteCarlo })}
                    className={`w-11 h-6 rounded-full transition-colors relative ${settings.enableMonteCarlo ? 'bg-[#6c8cff]' : 'bg-[#2d3148]'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.enableMonteCarlo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
              {settings.enableMonteCarlo && (
                <div className="col-span-2 bg-[#a78bfa18] border border-[#a78bfa33] rounded-xl p-4 text-sm text-[#c4b5fd]">
                  Monte Carlo simulation is enabled. Note: In V1, this uses simplified variance modeling. Full simulation engine coming in a future release.
                </div>
              )}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
