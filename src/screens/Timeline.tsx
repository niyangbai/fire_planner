import { useState } from 'react';
import { Plus, Pencil, Trash2, Copy, Calendar } from 'lucide-react';
import { usePlanStore } from '../store/planStore';
import type { PlanEvent } from '../types/plan';
import { EVENT_META, eventSummary } from '../constants/events';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import EventForm from '../components/events/EventForm';

// ── Event card within an age group ───────────────────────────────────────────

interface EventCardProps {
  event: PlanEvent;
  currency: string;
  onEdit: (e: PlanEvent) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function EventCard({ event, currency, onEdit, onDelete, onDuplicate }: EventCardProps) {
  const meta = EVENT_META[event.type];
  return (
    <div className="group flex items-center gap-3 p-3 rounded-xl border border-[#2d3148] bg-[#1a1d27] hover:border-[#404672] transition-all">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: meta.bg }}>
        {meta.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white">{event.title}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: meta.color }}>{meta.category}</span>
          <span className="text-xs text-[#7b82aa]">{eventSummary(event, currency)}</span>
          {event.endAge && <span className="text-xs text-[#404672]">→ age {event.endAge}</span>}
        </div>
        {event.note && <div className="text-xs text-[#7b82aa] mt-0.5 italic truncate">{event.note}</div>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconBtn title="Duplicate" onClick={() => onDuplicate(event.id)}><Copy size={13} /></IconBtn>
        <IconBtn title="Edit"      onClick={() => onEdit(event)}><Pencil size={13} /></IconBtn>
        <IconBtn title="Delete"    onClick={() => onDelete(event.id)} danger><Trash2 size={13} /></IconBtn>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${danger ? 'text-[#7b82aa] hover:text-[#f87171] hover:bg-[#f871711a]' : 'text-[#7b82aa] hover:text-white hover:bg-[#222638]'}`}
    >
      {children}
    </button>
  );
}

// ── Age group row ─────────────────────────────────────────────────────────────

interface AgeGroupProps {
  age: number;
  events: PlanEvent[];
  isCurrent: boolean;
  currency: string;
  onEdit: (e: PlanEvent) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function AgeGroup({ age, events, isCurrent, currency, onEdit, onDelete, onDuplicate }: AgeGroupProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 ${isCurrent ? 'bg-[#6c8cff] border-[#6c8cff] text-white' : 'bg-[#1a1d27] border-[#2d3148] text-[#7b82aa]'}`}>
          {age}
        </div>
        <div className="w-0.5 flex-1 bg-[#2d3148] mt-2" />
      </div>
      <div className="flex-1 pb-6">
        <div className="text-xs text-[#7b82aa] mb-2 font-medium">
          {isCurrent ? 'Now · ' : ''}Age {age}
        </div>
        <div className="flex flex-col gap-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} currency={currency} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function Timeline() {
  const { plan, deleteEvent, duplicateEvent } = usePlanStore();
  const { events, profile, settings } = plan;

  const [isAddOpen, setIsAddOpen]         = useState(false);
  const [editingEvent, setEditingEvent]   = useState<PlanEvent | null>(null);

  // Group events by startAge
  const ageMap = new Map<number, PlanEvent[]>();
  for (const event of [...events].sort((a, b) => a.startAge - b.startAge)) {
    const bucket = ageMap.get(event.startAge) ?? [];
    bucket.push(event);
    ageMap.set(event.startAge, bucket);
  }
  const ages = Array.from(ageMap.keys()).sort((a, b) => a - b);

  const closePanel = () => { setIsAddOpen(false); setEditingEvent(null); };

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Timeline Planner"
          subtitle="Build your life plan event by event."
          action={<Button variant="primary" onClick={() => setIsAddOpen(true)}><Plus size={15} /> Add Event</Button>}
        />

        {ages.length === 0 ? (
          <EmptyState onAdd={() => setIsAddOpen(true)} />
        ) : (
          <div>
            {/* Always render current age node */}
            {!ageMap.has(profile.currentAge) && (
              <div className="flex gap-4 mb-2">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 bg-[#6c8cff] border-[#6c8cff] text-white">
                    {profile.currentAge}
                  </div>
                  <div className="w-0.5 flex-1 bg-[#2d3148] mt-2" />
                </div>
                <div className="flex-1 pb-6">
                  <div className="text-xs text-[#7b82aa] mb-1 font-medium">Now · Age {profile.currentAge}</div>
                </div>
              </div>
            )}

            {ages.map((age) => (
              <AgeGroup
                key={age}
                age={age}
                events={ageMap.get(age)!}
                isCurrent={age === profile.currentAge}
                currency={settings.currency}
                onEdit={setEditingEvent}
                onDelete={deleteEvent}
                onDuplicate={duplicateEvent}
              />
            ))}

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 bg-[#1a1d27] border-[#2d3148] text-[#404672]">
                {settings.projectionEndAge}
              </div>
              <div className="pt-2.5 text-xs text-[#404672]">Age {settings.projectionEndAge} — end of projection</div>
            </div>
          </div>
        )}
      </div>

      {(isAddOpen || editingEvent) && (
        <div className="fixed inset-0 z-40 bg-black/50 md:static md:z-auto md:bg-transparent">
          <div className="absolute inset-x-0 bottom-0 top-12 flex flex-col overflow-hidden rounded-t-2xl border border-[#2d3148] bg-[#0f1117] shadow-2xl md:relative md:top-0 md:w-96 md:rounded-none md:border-y-0 md:border-r-0 md:border-l md:shadow-none">
            <EventForm existingEvent={editingEvent ?? undefined} onClose={closePanel} />
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#1a1d27] border border-[#2d3148] flex items-center justify-center mb-4">
        <Calendar size={28} className="text-[#404672]" />
      </div>
      <div className="text-white font-medium mb-2">No events yet</div>
      <div className="text-sm text-[#7b82aa] max-w-xs mb-6">
        Add the next financial event in your life — a salary raise, house purchase, or FIRE milestone.
      </div>
      <Button variant="primary" onClick={onAdd}><Plus size={15} /> Add your first event</Button>
    </div>
  );
}
