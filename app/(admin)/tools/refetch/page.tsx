'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SUB_CATEGORY_LABELS } from '@/lib/utils/categories';
import type { VenueSubCategory } from '@/types/venue';

type VenueStatus = 'draft' | 'approved' | 'published' | 'archived';

interface CategoryOption {
  id: string;
  name: string;
}

interface PreviewVenue {
  id: string;
  name: string;
  status: VenueStatus;
}

interface DryRunResult {
  queued: number;
  venues: PreviewVenue[];
}

interface RunResult {
  processed: number;
  updated: number;
  errors: number;
}

const STATUS_OPTIONS: Array<{ value: '' | VenueStatus; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const SUB_CATEGORY_OPTIONS = Object.entries(SUB_CATEGORY_LABELS).map(([value, label]) => ({
  value: value as VenueSubCategory,
  label,
}));

function statusBadgeClass(status: VenueStatus): string {
  if (status === 'published') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (status === 'approved') return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  if (status === 'archived') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-white/[0.06] text-dim border-white/[0.12]';
}

export default function RefetchToolPage() {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [subCategory, setSubCategory] = useState<'' | VenueSubCategory>('');
  const [status, setStatus] = useState<'' | VenueStatus>('');
  const [previewResult, setPreviewResult] = useState<DryRunResult | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingRun, setLoadingRun] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadCategories() {
      try {
        const { data, error: fetchError } = await supabase
          .from('category')
          .select('id, name')
          .eq('level', 1)
          .order('sort_order');

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        const rows = data ?? [];
        setCategories(rows.map(row => ({ id: row.id as string, name: row.name as string })));
      } catch {
        setError('Failed to load categories.');
      }
    }

    void loadCategories();
  }, []);

  const filterPayload = useMemo(() => ({
    ...(categoryId ? { category_id: categoryId } : {}),
    ...(subCategory ? { sub_category: subCategory } : {}),
    ...(status ? { status } : {}),
  }), [categoryId, subCategory, status]);

  async function handlePreview() {
    setError(null);
    setRunResult(null);
    setLoadingPreview(true);

    try {
      const res = await fetch('/api/venues/refetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...filterPayload, dry_run: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Preview failed.');
        setPreviewResult(null);
        return;
      }

      setPreviewResult(data as DryRunResult);
    } catch {
      setError('Network error while previewing venues.');
      setPreviewResult(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleRun() {
    setError(null);
    setLoadingRun(true);

    try {
      const res = await fetch('/api/venues/refetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...filterPayload, dry_run: false }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Refetch failed.');
        return;
      }

      setRunResult(data as RunResult);
    } catch {
      setError('Network error while running refetch.');
    } finally {
      setLoadingRun(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] uppercase text-ghost">Wander Ops</p>
        <h1 className="mt-1 font-display text-3xl text-ink">Google Places Refetch</h1>
        <p className="mt-2 text-sm text-dim">
          Targeted refresh for venue photos and metadata. Max 50 venues per run.
        </p>
      </div>

      <section className="bg-card border border-white/[0.07] rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="space-y-1.5">
            <span className="text-xs text-dim uppercase tracking-wide">Category</span>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-white/[0.12] bg-raised px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-flame/40"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs text-dim uppercase tracking-wide">Sub-category</span>
            <select
              value={subCategory}
              onChange={e => setSubCategory(e.target.value as '' | VenueSubCategory)}
              className="w-full rounded-lg border border-white/[0.12] bg-raised px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-flame/40"
            >
              <option value="">All Sub-categories</option>
              {SUB_CATEGORY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs text-dim uppercase tracking-wide">Status</span>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as '' | VenueStatus)}
              className="w-full rounded-lg border border-white/[0.12] bg-raised px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-flame/40"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.label} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-lg border border-flame/20 bg-flame/10 px-3 py-2 text-xs text-dim">
          Refetch updates rating, opening hours, price level, and photos. Use Preview before running.
        </div>

        <button
          type="button"
          onClick={handlePreview}
          disabled={loadingPreview || loadingRun}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-flame text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loadingPreview ? 'Previewing…' : 'Preview venues'}
        </button>
      </section>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {previewResult && (
        <section className="bg-card border border-white/[0.07] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-xl text-ink">{previewResult.queued} venues will be refetched</h2>
            <button
              type="button"
              onClick={handleRun}
              disabled={loadingRun || loadingPreview || previewResult.queued === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.12] bg-raised text-sm font-semibold text-ink hover:border-flame/60 hover:text-flame disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingRun ? 'Running…' : 'Run Refetch'}
            </button>
          </div>

          <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {previewResult.venues.map(venue => (
              <li
                key={venue.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-raised/60 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-ink">{venue.name}</p>
                  <p className="text-[11px] text-ghost">{venue.id}</p>
                </div>
                <span className={`px-2 py-1 rounded-md border text-[11px] uppercase tracking-wide ${statusBadgeClass(venue.status)}`}>
                  {venue.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {runResult && (
        <section className="bg-card border border-white/[0.07] rounded-xl p-5">
          <p className="text-sm text-ink">
            Done: <span className="text-flame font-semibold">{runResult.updated}</span> updated,
            <span className="text-red-300 font-semibold"> {runResult.errors}</span> errors,
            <span className="text-dim"> {runResult.processed} processed</span>.
          </p>
        </section>
      )}
    </div>
  );
}
