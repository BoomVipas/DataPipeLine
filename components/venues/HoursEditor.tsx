'use client';

import type { OperatingHours, DayHours } from '@/types/venue';

const DAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
] as const;

type DayKey = (typeof DAYS)[number]['key'];

interface HoursEditorProps {
  value: OperatingHours;
  onChange: (hours: OperatingHours) => void;
}

export default function HoursEditor({ value, onChange }: HoursEditorProps) {
  function isOpen(day: DayKey) {
    return (value[day]?.length ?? 0) > 0;
  }

  function toggleOpen(day: DayKey) {
    const updated = { ...value };
    if (isOpen(day)) {
      updated[day] = [];
    } else {
      updated[day] = [{ open: '09:00', close: '21:00' }];
    }
    onChange(updated);
  }

  function updateSlot(day: DayKey, index: number, field: 'open' | 'close', time: string) {
    const updated = { ...value };
    const slots = [...(updated[day] || [])];
    slots[index] = { ...slots[index], [field]: time };
    updated[day] = slots;
    onChange(updated);
  }

  function addSplit(day: DayKey) {
    const updated = { ...value };
    updated[day] = [...(updated[day] || []), { open: '18:00', close: '22:00' }];
    onChange(updated);
  }

  function removeSlot(day: DayKey, index: number) {
    const updated = { ...value };
    const slots = [...(updated[day] || [])];
    slots.splice(index, 1);
    updated[day] = slots;
    onChange(updated);
  }

  return (
    <div className="space-y-2">
      {DAYS.map(({ key, label }) => {
        const slots: DayHours[] = value[key] || [];
        const open = slots.length > 0;

        return (
          <div key={key} className="flex items-start gap-3">
            {/* Day label + toggle */}
            <div className="flex items-center gap-2 w-24 shrink-0 pt-1.5">
              <button
                type="button"
                onClick={() => toggleOpen(key)}
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  open ? 'bg-gray-900' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    open ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700 font-medium">{label}</span>
            </div>

            {/* Time slots */}
            {open ? (
              <div className="flex-1 space-y-1.5">
                {slots.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.open}
                      onChange={e => updateSlot(key, idx, 'open', e.target.value)}
                      className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                    <span className="text-gray-400 text-sm">to</span>
                    <input
                      type="time"
                      value={slot.close}
                      onChange={e => updateSlot(key, idx, 'close', e.target.value)}
                      className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                    {slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlot(key, idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                {slots.length < 2 && (
                  <button
                    type="button"
                    onClick={() => addSplit(key)}
                    className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    + Add split shift
                  </button>
                )}
              </div>
            ) : (
              <span className="pt-1.5 text-sm text-gray-400">Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
