'use client';

import { useState } from 'react';
import type { Venue } from '@/types/venue';

interface Props {
  venue: Venue;
  categories: { id: string; name: string; key: string }[];
}

const PRICE_OPTIONS = [
  { value: 1, label: '฿ Budget' },
  { value: 2, label: '฿฿ Mid-range' },
  { value: 3, label: '฿฿฿ Pricey' },
  { value: 4, label: '฿฿฿฿ Luxury' },
];

export default function QuickFillPanel({ venue, categories }: Props) {
  const [form, setForm] = useState({
    short_description: venue.short_description ?? '',
    address: venue.address ?? '',
    district: venue.district ?? '',
    phone: venue.phone ?? '',
    price_level: venue.price_level ?? '',
    category_id: venue.category_id ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which fields are still missing
  const missing = {
    short_description: !venue.short_description,
    address: !venue.address,
    district: !venue.district,
    phone: !venue.phone,
    price_level: !venue.price_level,
    category_id: !venue.category_id,
  };

  const missingCount = Object.values(missing).filter(Boolean).length;
  if (missingCount === 0) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    const patch: Record<string, unknown> = {};
    if (missing.short_description && form.short_description) patch.short_description = form.short_description;
    if (missing.address && form.address) patch.address = form.address;
    if (missing.district && form.district) patch.district = form.district;
    if (missing.phone && form.phone) patch.phone = form.phone;
    if (missing.price_level && form.price_level) patch.price_level = Number(form.price_level);
    if (missing.category_id && form.category_id) patch.category_id = form.category_id;

    if (Object.keys(patch).length === 0) { setSaving(false); return; }

    const res = await fetch(`/api/venues/${venue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => window.location.reload(), 800);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Save failed');
    }
    setSaving(false);
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-amber-900">
            {missingCount} missing field{missingCount !== 1 ? 's' : ''}
          </h3>
          <p className="text-xs text-amber-700 mt-0.5">Fill these before publishing</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save all'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      <div className="space-y-3">
        {missing.category_id && (
          <Field label="Category">
            <select
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select category…</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}

        {missing.short_description && (
          <Field label="Short description">
            <textarea
              value={form.short_description}
              onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))}
              rows={3}
              placeholder="2–3 sentences shown on app cards…"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </Field>
        )}

        {missing.address && (
          <Field label="Address">
            <input
              type="text"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Street address…"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </Field>
        )}

        {missing.district && (
          <Field label="District">
            <input
              type="text"
              value={form.district}
              onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
              placeholder="e.g. Sukhumvit, Silom…"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </Field>
        )}

        {missing.phone && (
          <Field label="Phone">
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+66 2 xxx xxxx"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </Field>
        )}

        {missing.price_level && (
          <Field label="Price level">
            <select
              value={form.price_level}
              onChange={e => setForm(f => ({ ...f, price_level: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select price level…</option>
              {PRICE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-amber-900 mb-1">{label}</label>
      {children}
    </div>
  );
}
