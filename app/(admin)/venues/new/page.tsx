'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AutofillInput from '@/components/venues/AutofillInput';
import VenueForm from '@/components/venues/VenueForm';
import type { AutofillVenueData } from '@/types/autofill';

export default function NewVenuePage() {
  const router = useRouter();
  const [autofillData, setAutofillData] = useState<AutofillVenueData | null>(null);
  const [descriptionIsAi, setDescriptionIsAi] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function handleAutofillResult(data: AutofillVenueData, isAi: boolean) {
    setAutofillData(data);
    setDescriptionIsAi(isAi);
    setFormKey(k => k + 1); // force VenueForm to remount with new initial values
    // Scroll to form
    setTimeout(() => {
      document.getElementById('venue-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Add New Venue</h1>
      </div>

      {/* Phase 1: Auto-fill input */}
      <AutofillInput onResult={handleAutofillResult} />

      {/* Phase 2: Form (shown immediately, pre-filled when autofill runs) */}
      <div id="venue-form">
        {autofillData && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 mb-4">
            Data fetched from: {autofillData.sources_used.join(', ')}. Review and edit below.
          </div>
        )}
        <VenueForm
          key={formKey}
          initial={autofillData ?? {}}
          descriptionIsAi={descriptionIsAi}
          mode="create"
          adminUserId=""
        />
      </div>
    </div>
  );
}
