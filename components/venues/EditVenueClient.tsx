'use client';

import { useState } from 'react';
import AutofillInput from '@/components/venues/AutofillInput';
import PhotoManager from '@/components/venues/PhotoManager';
import VenueForm from '@/components/venues/VenueForm';
import type { Venue } from '@/types/venue';
import type { AutofillVenueData } from '@/types/autofill';

interface EditVenueClientProps {
  venue: Venue;
  venueId: string;
  adminUserId: string;
  initialPhotos: string[];
}

export default function EditVenueClient({
  venue,
  venueId,
  adminUserId,
  initialPhotos,
}: EditVenueClientProps) {
  const [mergedInitial, setMergedInitial] = useState<Venue | (Venue & Partial<AutofillVenueData>)>(venue);
  const [formKey, setFormKey] = useState(0);
  const [autofillBanner, setAutofillBanner] = useState<string | null>(null);
  const [autofillPreviewUrl, setAutofillPreviewUrl] = useState<string | null>(null);

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
    setAutofillPreviewUrl(initialPhotos.length === 0 ? (data.preview_photo_url ?? null) : null);
    setTimeout(() => {
      document.getElementById('edit-venue-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  return (
    <>
      <AutofillInput onResult={handleAutofillResult} />

      <div className="bg-card border border-white/[0.07] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-dim uppercase tracking-wider">Photos</h3>
          {initialPhotos.length > 0 && (
            <span className="text-xs text-ghost">{initialPhotos.length} saved</span>
          )}
        </div>

        {autofillPreviewUrl && initialPhotos.length === 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
                Preview
              </span>
              <p className="text-xs text-ghost">
                Temporary photo from Google — approve or publish to save permanently.
              </p>
            </div>
            <div className="w-32 aspect-square rounded-lg overflow-hidden border border-amber-400/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={autofillPreviewUrl} alt="Autofill preview" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {initialPhotos.length > 0 ? (
          <PhotoManager venueId={venueId} initialPhotos={initialPhotos} />
        ) : !autofillPreviewUrl ? (
          <div className="py-6 text-center space-y-1.5">
            <svg className="w-8 h-8 text-ghost mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <p className="text-sm text-ghost">No photos yet.</p>
            <p className="text-xs text-ghost/60">
              Photos are auto-fetched from Google when you approve or publish this venue.
            </p>
          </div>
        ) : null}
      </div>

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
