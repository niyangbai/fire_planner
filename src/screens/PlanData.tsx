import { useRef, useState } from 'react';
import { Download, Upload, RotateCcw, Pencil, Check, Database } from 'lucide-react';
import { usePlanStore } from '../store/planStore';
import type { Plan } from '../types/plan';
import { SCHEMA_VERSION } from '../types/plan';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { formatDate } from '../utils/format';

export default function PlanData() {
  const { plan, renamePlan, resetPlan, importPlan, lastSaved } = usePlanStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(plan.name);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  function handleExport() {
    const json = JSON.stringify(plan, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.name.replace(/\s+/g, '_')}_fire_plan.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Plan;
        if (!parsed.schemaVersion || !parsed.profile || !parsed.events) {
          setImportError('Invalid plan file: missing required fields.');
          return;
        }
        if (parsed.schemaVersion !== SCHEMA_VERSION) {
          setImportError(`Schema version mismatch (expected ${SCHEMA_VERSION}, got ${parsed.schemaVersion}).`);
          return;
        }
        importPlan(parsed);
        setImportSuccess(true);
      } catch {
        setImportError('Could not parse the file. Make sure it is a valid JSON export.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleRename() {
    if (newName.trim()) {
      renamePlan(newName.trim());
    }
    setIsRenaming(false);
  }

  function handleReset() {
    if (resetConfirm) {
      resetPlan();
      setResetConfirm(false);
    } else {
      setResetConfirm(true);
    }
  }

  const planStats = {
    events: plan.events.length,
    checkpoints: plan.lifelineCheckpoints.length,
    created: formatDate(plan.createdAt),
    updated: formatDate(plan.updatedAt),
  };

  return (
    <div className="p-8 overflow-y-auto h-full">
      <PageHeader
        title="Plan Data"
        subtitle="Manage your plan, import, and export."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Plan Info */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Database size={16} className="text-[#6c8cff]" />
            <div className="text-sm font-semibold text-white">Plan Details</div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between bg-[#222638] rounded-lg px-4 py-3">
              <span className="text-xs text-[#7b82aa]">Plan Name</span>
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="py-1 text-xs w-40"
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  />
                  <button onClick={handleRename} className="text-[#4ade80]">
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white font-medium">{plan.name}</span>
                  <button onClick={() => setIsRenaming(true)} className="text-[#7b82aa] hover:text-white transition-colors">
                    <Pencil size={12} />
                  </button>
                </div>
              )}
            </div>

            {[
              { label: 'Created', value: planStats.created },
              { label: 'Last Updated', value: planStats.updated },
              { label: 'Last Saved Locally', value: lastSaved ? formatDate(lastSaved.toISOString()) : 'Not saved' },
              { label: 'Schema Version', value: `v${plan.schemaVersion}` },
              { label: 'Events', value: `${planStats.events}` },
              { label: 'Lifeline Checkpoints', value: `${planStats.checkpoints}` },
              { label: 'Currency', value: plan.settings.currency },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between bg-[#222638] rounded-lg px-4 py-3">
                <span className="text-xs text-[#7b82aa]">{label}</span>
                <span className="text-sm text-white">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Import / Export */}
        <div className="flex flex-col gap-4">
          <Card className="p-6">
            <div className="text-sm font-semibold text-white mb-2">Export Plan</div>
            <div className="text-xs text-[#7b82aa] mb-4 leading-relaxed">
              Download your entire plan as a JSON file. You can reimport it later or share it.
            </div>
            <Button variant="primary" onClick={handleExport}>
              <Download size={15} /> Download JSON
            </Button>
          </Card>

          <Card className="p-6">
            <div className="text-sm font-semibold text-white mb-2">Import Plan</div>
            <div className="text-xs text-[#7b82aa] mb-4 leading-relaxed">
              Upload a previously exported plan JSON file. This will replace your current plan.
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="secondary" onClick={handleImportClick}>
              <Upload size={15} /> Upload JSON
            </Button>
            {importError && (
              <div className="mt-3 text-xs text-[#f87171] bg-[#f871711a] rounded-lg px-3 py-2">
                {importError}
              </div>
            )}
            {importSuccess && (
              <div className="mt-3 text-xs text-[#4ade80] bg-[#4ade8018] rounded-lg px-3 py-2">
                Plan imported successfully!
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="text-sm font-semibold text-white mb-2">Reset Plan</div>
            <div className="text-xs text-[#7b82aa] mb-4 leading-relaxed">
              Clear all data and start fresh. This cannot be undone — export first if needed.
            </div>
            {resetConfirm ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#f87171]">Are you sure?</span>
                <Button variant="danger" onClick={handleReset}>
                  Yes, Reset
                </Button>
                <Button variant="ghost" onClick={() => setResetConfirm(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={handleReset} className="text-[#f87171] hover:text-[#f87171]">
                <RotateCcw size={15} /> Reset Plan
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
