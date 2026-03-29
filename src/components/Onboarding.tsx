import { useState } from 'react';
import { Flame, ArrowRight } from 'lucide-react';
import { usePlanStore, makeSeedEvents } from '../store/planStore';
import Input from './ui/Input';
import Button from './ui/Button';

export default function Onboarding() {
  const { plan, updateProfile, addEvent, deleteEvent, renamePlan, completeOnboarding } = usePlanStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(plan.name);
  const [age, setAge] = useState(String(plan.profile.currentAge));
  const [salary, setSalary] = useState('5000');
  const [expenses, setExpenses] = useState('3000');
  const [cash, setCash] = useState(String(plan.profile.currentCash));
  const [investments, setInvestments] = useState(String(plan.profile.currentInvestments));
  const [contrib, setContrib] = useState('1000');

  function handleFinish() {
    const currentAge = Number(age) || 30;
    renamePlan(name || 'My FIRE Plan');
    updateProfile({
      currentAge,
      currentCash: Number(cash) || 0,
      currentInvestments: Number(investments) || 0,
    });

    // Replace the default seed events with the user's actual values
    const existing = plan.events.filter(
      (e) =>
        (e.type === 'job_income' || e.type === 'expense_change' || e.type === 'contribution_change') &&
        e.startAge === plan.profile.currentAge,
    );
    existing.forEach((e) => deleteEvent(e.id));

    const seeds = makeSeedEvents(currentAge, Number(salary) || 0, Number(expenses) || 0, Number(contrib) || 0);
    seeds.forEach((e) => addEvent(e));

    completeOnboarding();
  }

  const steps = [
    {
      title: 'Welcome to FIRE Planner',
      subtitle: "Let's set up your plan in a few quick steps.",
      content: (
        <div className="flex flex-col gap-5">
          <Input
            label="Plan Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My FIRE Plan"
          />
          <Input
            label="Your Current Age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="30"
            suffix="yrs"
          />
        </div>
      ),
    },
    {
      title: 'Your Monthly Income & Expenses',
      subtitle: 'What does your current financial picture look like?',
      content: (
        <div className="flex flex-col gap-5">
          <Input
            label="Monthly Salary (take-home)"
            type="number"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="5000"
            prefix="$"
          />
          <Input
            label="Monthly Living Expenses"
            type="number"
            value={expenses}
            onChange={(e) => setExpenses(e.target.value)}
            placeholder="3000"
            prefix="$"
          />
        </div>
      ),
    },
    {
      title: 'Your Current Savings',
      subtitle: "This is what you're starting with today.",
      content: (
        <div className="flex flex-col gap-5">
          <Input
            label="Cash / Savings"
            type="number"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            placeholder="20000"
            prefix="$"
          />
          <Input
            label="Investments (stocks, funds, etc.)"
            type="number"
            value={investments}
            onChange={(e) => setInvestments(e.target.value)}
            placeholder="50000"
            prefix="$"
          />
          <Input
            label="Monthly Investment Contribution"
            type="number"
            value={contrib}
            onChange={(e) => setContrib(e.target.value)}
            placeholder="1000"
            prefix="$"
          />
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1d27] border border-[#2d3148] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[#2d3148]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6c8cff] to-[#a78bfa] flex items-center justify-center">
              <Flame size={20} className="text-white" />
            </div>
            <div>
              <div className="text-xs text-[#7b82aa]">Step {step + 1} of {steps.length}</div>
              <div className="flex gap-1 mt-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all ${
                      i <= step ? 'bg-[#6c8cff]' : 'bg-[#2d3148]'
                    } ${i === step ? 'w-6' : 'w-3'}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-white">{current.title}</h2>
          <p className="text-sm text-[#7b82aa] mt-1">{current.subtitle}</p>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {current.content}
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => step > 0 ? setStep(step - 1) : undefined}
            disabled={step === 0}
          >
            Back
          </Button>
          <Button
            variant="primary"
            onClick={isLast ? handleFinish : () => setStep(step + 1)}
          >
            {isLast ? 'Start Planning' : 'Continue'}
            <ArrowRight size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
