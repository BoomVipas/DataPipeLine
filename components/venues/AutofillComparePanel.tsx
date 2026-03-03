'use client';

import { useState } from 'react';
import type { AutofillVenueData } from '@/types/autofill';

type Source = 'gemini' | 'google' | 'both';

interface CompareField {
  key: keyof AutofillVenueData;
  label: string;
  format?: (v: unknown) => string;
}

const FIELDS: CompareField[] = [
  { key: 'name',              label: 'Name' },
  { key: 'address',           label: 'Address' },
  { key: 'phone',             label: 'Phone' },
  { key: 'website_url',       label: 'Website' },
  { key: 'rating',            label: 'Rating',     format: v => `⭐ ${v}` },
  { key: 'rating_count',      label: 'Reviews',    format: v => `${(v as number).toLocaleString()} reviews` },
  { key: 'price_level',       label: 'Price',      format: v => ['฿','฿฿','฿฿฿','฿฿฿฿'][(v as number)-1] },
  { key: 'lat',               label: 'Latitude',   format: v => String(v) },
  { key: 'lng',               label: 'Longitude',  format: v => String(v) },
  { key: 'district',          label: 'District' },
  { key: 'short_description', label: 'Description' },
  { key: 'opening_hours',     label: 'Hours',      format: () => '(structured data)' },
  { key: 'google_place_id',   label: 'Place ID' },
];

function fmt(val: unknown, field: CompareField): string {
  if (val === null || val === undefined || val === '') return '—';
  if (field.format) return field.format(val);
  if (typeof val === 'object') return JSON.stringify(val).slice(0, 60) + '…';
  return String(val);
}

function valuesMatch(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

interface Props {
  gemini: Partial<AutofillVenueData>;
  google: Partial<AutofillVenueData>;
  onApply: (merged: Partial<AutofillVenueData>) => void;
  onClose: () => void;
}

export default function AutofillComparePanel({ gemini, google, onApply, onClose }: Props) {
  // For each field, track which source is selected
  const [selections, setSelections] = useState<Record<string, Source>>(() => {
    const init: Record<string, Source> = {};
    for (const f of FIELDS) {
      const gVal = gemini[f.key];
      const mVal = google[f.key];
      if (gVal != null && mVal != null) {
        // Default: prefer Google for factual fields, Gemini for description
        init[f.key] = f.key === 'short_description' ? 'gemini' : 'google';
      } else if (gVal != null) {
        init[f.key] = 'gemini';
      } else {
        init[f.key] = 'google';
      }
    }
    return init;
  });

  function handleApply() {
    const merged: Partial<AutofillVenueData> = {};
    for (const f of FIELDS) {
      const src = selections[f.key];
      const val = src === 'gemini' ? gemini[f.key] : google[f.key];
      if (val != null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (merged as any)[f.key] = val;
      }
    }
    // Always include sources_used
    merged.sources_used = ['gemini', 'google'];
    onApply(merged);
  }

  // Only show rows where at least one source has data
  const visibleFields = FIELDS.filter(f => gemini[f.key] != null || google[f.key] != null);

  const googleCount = visibleFields.filter(f => google[f.key] != null).length;
  const geminiCount = visibleFields.filter(f => gemini[f.key] != null).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Compare Sources</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Select which source to use for each field, then apply to form.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Source badges */}
        <div className="flex gap-3 px-6 pt-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-200">
            <span className="text-xs font-semibold text-purple-700">✦ Gemini AI</span>
            <span className="text-xs text-purple-500">{geminiCount} fields</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-xs font-semibold text-blue-700">📍 Google Maps</span>
            <span className="text-xs text-blue-500">{googleCount} fields</span>
          </div>
          <button
            onClick={() => setSelections(s => Object.fromEntries(Object.keys(s).map(k => [k, 'google'])) as typeof s)}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700 underline"
          >
            All Google
          </button>
          <button
            onClick={() => setSelections(s => Object.fromEntries(Object.keys(s).map(k => [k, 'gemini'])) as typeof s)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            All Gemini
          </button>
        </div>

        {/* Field comparison table */}
        <div className="overflow-y-auto flex-1 px-6 pb-2">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium w-28">Field</th>
                <th className="text-left py-2 text-gray-500 font-medium">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block"/>Gemini</span>
                </th>
                <th className="text-left py-2 text-gray-500 font-medium">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>Google Maps</span>
                </th>
                <th className="text-center py-2 text-gray-500 font-medium w-20">Use</th>
              </tr>
            </thead>
            <tbody>
              {visibleFields.map(f => {
                const gVal = gemini[f.key];
                const mVal = google[f.key];
                const match = valuesMatch(gVal, mVal);
                const selected = selections[f.key];

                return (
                  <tr key={f.key} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2.5 pr-2 font-medium text-gray-700 align-top">{f.label}</td>

                    {/* Gemini value */}
                    <td className={`py-2.5 pr-3 align-top max-w-[200px] ${selected === 'gemini' ? 'text-gray-900' : 'text-gray-400'}`}>
                      <div className="break-words leading-relaxed">{fmt(gVal, f)}</div>
                    </td>

                    {/* Google value */}
                    <td className={`py-2.5 pr-3 align-top max-w-[200px] ${selected === 'google' ? 'text-gray-900' : 'text-gray-400'}`}>
                      <div className="break-words leading-relaxed">{fmt(mVal, f)}</div>
                    </td>

                    {/* Selector */}
                    <td className="py-2.5 text-center align-top">
                      {match ? (
                        <span className="text-green-600 text-[10px] font-medium">✓ Match</span>
                      ) : (
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => setSelections(s => ({ ...s, [f.key]: 'gemini' }))}
                            title="Use Gemini"
                            className={`w-5 h-5 rounded-full border-2 transition-colors ${
                              selected === 'gemini'
                                ? 'border-purple-500 bg-purple-500'
                                : 'border-gray-300 hover:border-purple-300'
                            }`}
                          />
                          <button
                            onClick={() => setSelections(s => ({ ...s, [f.key]: 'google' }))}
                            title="Use Google"
                            className={`w-5 h-5 rounded-full border-2 transition-colors ${
                              selected === 'google'
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300 hover:border-blue-300'
                            }`}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <p className="text-xs text-gray-500">
            Purple = Gemini selected · Blue = Google selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Apply to Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
