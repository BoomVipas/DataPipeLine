'use client';

import { useState } from 'react';
import AutofillInput from '@/components/venues/AutofillInput';
import VenueForm from '@/components/venues/VenueForm';
import type { Venue } from '@/types/venue';
import type { AutofillVenueData } from '@/types/autofill';

interface EditVenueClientProps {
  venue: Venue;
  venueId: string;
  adminUserId: string;
}

export default function EditVenueClient({ venue, venueId, adminUserId }: EditVenueClientProps) {
  const [mergedInitial, setMergedInitial] = useState<Venue | (Venue & Partial<AutofillVenueData>)>(venue);
  const [formKey, setFormKey] = useState(0);
  const [autofillBanner, setAutofillBanner] = useState<string | null>(null);

  function handleAutofillResult(data: AutofillVenueData) {
    // Merge autofill data into existing venue — venue fields take lower priority so
    // autofill can fill in missing fields, but don't overwrite fields already set.
    const merged = {
      ...data,
      ...Object.fromEntries(
        Object.entries(venue).filter(([, v]) => v !== null && v !== undefined && v !== '')
      ),
    } as Venue & Partial<AutofillVenueData>;
    setMergedInitial(merged);
    setAutofillBanner(`Autofill data fetched from: ${data.sources_used.join(', ')}. Missing fields pre-filled below.`);
    setFormKey(k => k + 1);
    setTimeout(() => {
      document.getElementById('edit-venue-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  return (
    <>
      <AutofillInput onResult={handleAutofillResult} />

      <div id="edit-venue-form">
        {autofillBanner && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 mb-4">
            {autofillBanner}
          </div>
        )}
        <VenueForm
          key={formKey}
          initial={mergedInitial}
          venueId={venueId}
          mode="edit"
          adminUserId={adminUserId}
        />
      </div>
    </>
  );
}
