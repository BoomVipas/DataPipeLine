'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { AutofillVenueData } from '@/types/autofill';

const MAX_CONCURRENT = 10;

type QueueItemStatus = 'queued' | 'fetching' | 'saving' | 'saved' | 'approved' | 'error';

interface QueueItem {
  id: string;
  input: string;
  status: QueueItemStatus;
  venueId?: string;
  venueName?: string;
  photoPreview?: string;
  categoryName?: string;
  district?: string;
  rating?: number;
  priceLevel?: number;
  shortDescription?: string;
  error?: string;
}

interface Category {
  id: string;
  name: string;
  key: string;
}

function PriceDots({ level }: { level?: number }) {
  if (!level) return null;
  return (
    <span className="text-xs text-dim">
      {'฿'.repeat(level)}
      <span className="opacity-30">{'฿'.repeat(4 - level)}</span>
    </span>
  );
}

function StatusPill({ status }: { status: QueueItemStatus }) {
  const map: Record<QueueItemStatus, { label: string; className: string }> = {
    queued:   { label: 'Queued',     className: 'text-ghost bg-white/[0.06]' },
    fetching: { label: 'Fetching…',  className: 'text-blue-400 bg-blue-400/10' },
    saving:   { label: 'Saving…',    className: 'text-amber-400 bg-amber-400/10' },
    saved:    { label: 'Draft saved',className: 'text-emerald-400 bg-emerald-400/10' },
    approved: { label: 'Approved',   className: 'text-emerald-400 bg-emerald-400/10' },
    error:    { label: 'Error',      className: 'text-red-400 bg-red-400/10' },
  };
  const { label, className } = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${className}`}>
      {(status === 'fetching' || status === 'saving') && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse mr-1.5" />
      )}
      {label}
    </span>
  );
}

interface QueueCardProps {
  item: QueueItem;
  onApprove: () => void;
  onRemove: () => void;
  onRetry: () => void;
}

function QueueCard({ item, onApprove, onRemove, onRetry }: QueueCardProps) {
  const [approving, setApproving] = useState(false);

  async function handleApprove() {
    setApproving(true);
    await onApprove();
    setApproving(false);
  }

  return (
    <div className="bg-card border border-white/[0.07] rounded-xl overflow-hidden flex flex-col">
      {/* Photo / placeholder */}
      {item.status === 'saved' || item.status === 'approved' ? (
        <div className="h-32 bg-raised shrink-0 relative overflow-hidden">
          {item.photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.photoPreview}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-8 h-8 text-ghost/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
          )}
          {item.status === 'approved' && (
            <div className="absolute inset-0 bg-emerald-900/60 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          )}
        </div>
      ) : (
        <div className={`h-32 shrink-0 flex items-center justify-center ${
          item.status === 'error' ? 'bg-red-950/30' : 'bg-raised'
        }`}>
          {(item.status === 'fetching' || item.status === 'saving') ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              <span className="text-[11px] text-ghost">{item.status === 'fetching' ? 'Fetching data…' : 'Saving draft…'}</span>
            </div>
          ) : item.status === 'error' ? (
            <svg className="w-8 h-8 text-red-400/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          ) : (
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-ghost/30"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 p-3 space-y-2">
        {/* Status + dismiss */}
        <div className="flex items-start justify-between gap-2">
          <StatusPill status={item.status} />
          {item.status !== 'approved' && (
            <button onClick={onRemove} className="text-ghost hover:text-red-400 transition-colors shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Name */}
        <p className="text-sm font-semibold text-ink leading-tight">
          {item.venueName ?? item.input}
        </p>

        {/* Meta */}
        {item.status === 'saved' || item.status === 'approved' ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {item.categoryName && (
                <span className="text-[11px] text-dim">{item.categoryName}</span>
              )}
              {item.district && (
                <>
                  <span className="text-ghost/30 text-[10px]">·</span>
                  <span className="text-[11px] text-dim">{item.district}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {item.rating && (
                <span className="text-[11px] text-dim flex items-center gap-0.5">
                  <span className="text-amber-400">★</span>
                  {item.rating}
                </span>
              )}
              <PriceDots level={item.priceLevel} />
            </div>
            {item.shortDescription && (
              <p className="text-[11px] text-ghost leading-relaxed line-clamp-2">
                {item.shortDescription}
              </p>
            )}
          </div>
        ) : item.status === 'error' ? (
          <p className="text-[11px] text-red-400/80 leading-relaxed">{item.error}</p>
        ) : (
          <p className="text-[11px] text-ghost/50 truncate">{item.input}</p>
        )}
      </div>

      {/* Actions */}
      {(item.status === 'saved' || item.status === 'error' || item.status === 'approved') && (
        <div className="px-3 pb-3 flex gap-2">
          {item.status === 'saved' && item.venueId && (
            <>
              <Link
                href={`/venues/${item.venueId}/edit`}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-dim hover:text-ink border border-white/[0.07] hover:border-white/[0.15] rounded-lg transition-colors"
              >
                Edit
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </Link>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex-1 flex items-center justify-center py-1.5 text-xs font-semibold text-white bg-flame hover:opacity-90 disabled:opacity-50 rounded-lg transition-opacity"
              >
                {approving ? 'Approving…' : 'Approve'}
              </button>
            </>
          )}
          {item.status === 'error' && (
            <button
              onClick={onRetry}
              className="flex-1 flex items-center justify-center py-1.5 text-xs font-medium text-dim hover:text-ink border border-white/[0.07] rounded-lg transition-colors"
            >
              Retry
            </button>
          )}
          {item.status === 'approved' && item.venueId && (
            <Link
              href={`/venues/${item.venueId}`}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View venue
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function BatchPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [input, setInput] = useState('');
  const [approvingAll, setApprovingAll] = useState(false);
  const processingRef = useRef<Set<string>>(new Set());
  const categoryMapRef = useRef<Record<string, string>>({});
  const categoriesRef = useRef<Category[]>([]);

  // Load categories on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.from('category').select('id, name, key').eq('level', 1).then(({ data }) => {
      if (data) {
        setCategories(data);
        categoriesRef.current = data;
        const map: Record<string, string> = {};
        data.forEach((c: Category) => { map[c.key] = c.id; });
        categoryMapRef.current = map;
      }
    });
  }, []);

  const processItem = useCallback(async (id: string, itemInput: string) => {
    try {
      // Step 1: Autofill
      setQueue(q => q.map(i => i.id === id ? { ...i, status: 'fetching' } : i));

      const autofillRes = await fetch('/api/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: itemInput.trim(), input_type: 'auto' }),
      });

      if (!autofillRes.ok) {
        const err = await autofillRes.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? 'Autofill failed');
      }

      const { venue }: { venue: AutofillVenueData } = await autofillRes.json();

      // Step 2: Auto-save as draft
      setQueue(q => q.map(i => i.id === id ? { ...i, status: 'saving' } : i));

      const category_id = venue.suggested_category_slug
        ? (categoryMapRef.current[venue.suggested_category_slug] ?? null)
        : null;

      // Build clean payload — exclude autofill-only fields
      const {
        suggested_category_slug: _slug,
        suggested_sub_category,
        sources_used: _sources,
        description_is_ai: _ai,
        preview_photo_url: _preview,
        ...venueFields
      } = venue;

      const saveRes = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...venueFields,
          category_id,
          sub_category: suggested_sub_category ?? null,
          status: 'draft',
        }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? 'Save failed');
      }

      const { venue: saved } = await saveRes.json() as { venue: { id: string; name: string } };
      const catName = categoriesRef.current.find(c => c.key === venue.suggested_category_slug)?.name;

      setQueue(q => q.map(i => i.id === id ? {
        ...i,
        status: 'saved',
        venueId: saved.id,
        venueName: saved.name,
        photoPreview: venue.preview_photo_url,
        categoryName: catName,
        district: venue.district,
        rating: venue.rating,
        priceLevel: venue.price_level,
        shortDescription: venue.short_description,
      } : i));

    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setQueue(q => q.map(i => i.id === id ? { ...i, status: 'error', error: msg } : i));
    } finally {
      processingRef.current.delete(id);
    }
  }, []);

  // Concurrency manager — fills open slots whenever queue changes
  useEffect(() => {
    const inFlight = processingRef.current.size;
    const slots = MAX_CONCURRENT - inFlight;
    if (slots <= 0) return;

    const toStart = queue
      .filter(i => i.status === 'queued' && !processingRef.current.has(i.id))
      .slice(0, slots);

    toStart.forEach(item => {
      processingRef.current.add(item.id);
      processItem(item.id, item.input);
    });
  }, [queue, processItem]);

  function addItem() {
    if (!input.trim()) return;
    const newItem: QueueItem = {
      id: crypto.randomUUID(),
      input: input.trim(),
      status: 'queued',
    };
    setQueue(q => [...q, newItem]);
    setInput('');
  }

  async function approveItem(venueId: string) {
    const res = await fetch(`/api/venues/${venueId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });
    if (res.ok) {
      setQueue(q => q.map(i => i.venueId === venueId ? { ...i, status: 'approved' } : i));
    }
  }

  async function approveAll() {
    setApprovingAll(true);
    const saved = queue.filter(i => i.status === 'saved' && i.venueId);
    for (const item of saved) {
      await approveItem(item.venueId!);
    }
    setApprovingAll(false);
  }

  function removeItem(id: string) {
    setQueue(q => q.filter(i => i.id !== id));
  }

  function retryItem(id: string) {
    setQueue(q => q.map(i => i.id === id ? { ...i, status: 'queued', error: undefined } : i));
  }

  const savedCount = queue.filter(i => i.status === 'saved').length;
  const fetchingCount = queue.filter(i => i.status === 'fetching' || i.status === 'saving').length;
  const errorCount = queue.filter(i => i.status === 'error').length;
  const approvedCount = queue.filter(i => i.status === 'approved').length;

  // Suppress unused warning — categories used only for display via categoriesRef
  void categories;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="pt-1">
        <p className="text-xs text-ghost uppercase tracking-widest font-medium mb-1">Wander Ops</p>
        <h1 className="text-2xl font-bold font-display text-ink tracking-tight">Batch Add</h1>
        <p className="text-sm text-dim mt-1">
          Add venue names one by one — autofill and draft save run in the background. Up to {MAX_CONCURRENT} at once.
        </p>
      </div>

      {/* Input bar */}
      <div className="bg-card border border-white/[0.07] rounded-xl p-4">
        <form onSubmit={e => { e.preventDefault(); addItem(); }} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Venue name or Google Maps URL…"
            autoFocus
            className="flex-1 px-3 py-2.5 text-sm bg-raised border border-white/[0.07] rounded-lg text-ink placeholder:text-ghost focus:outline-none focus:border-flame/50 focus:ring-1 focus:ring-flame/30 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-flame text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add
          </button>
        </form>
        {queue.length > 0 && (
          <p className="text-[11px] text-ghost mt-2">
            Drafts are auto-saved — closing the tab is safe. Review them in{' '}
            <Link href="/venues?status=draft" className="text-flame hover:underline">Venues › Draft</Link>.
          </p>
        )}
      </div>

      {/* Queue grid */}
      {queue.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {queue.map(item => (
              <QueueCard
                key={item.id}
                item={item}
                onApprove={() => item.venueId ? approveItem(item.venueId) : Promise.resolve()}
                onRemove={() => removeItem(item.id)}
                onRetry={() => retryItem(item.id)}
              />
            ))}
          </div>

          {/* Footer bar */}
          <div className="flex items-center justify-between bg-card border border-white/[0.07] rounded-xl px-5 py-3">
            <div className="flex items-center gap-4 text-xs font-medium">
              {savedCount > 0 && <span className="text-emerald-400">{savedCount} ready</span>}
              {fetchingCount > 0 && <span className="text-blue-400">{fetchingCount} processing</span>}
              {errorCount > 0 && <span className="text-red-400">{errorCount} error{errorCount > 1 ? 's' : ''}</span>}
              {approvedCount > 0 && <span className="text-ghost">{approvedCount} approved</span>}
              {savedCount === 0 && fetchingCount === 0 && errorCount === 0 && approvedCount === 0 && (
                <span className="text-ghost">{queue.length} queued</span>
              )}
            </div>
            {savedCount > 0 && (
              <button
                onClick={approveAll}
                disabled={approvingAll}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-semibold rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
              >
                {approvingAll ? 'Approving…' : `Approve All (${savedCount})`}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="bg-card border border-white/[0.07] rounded-xl py-24 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
            <svg className="w-6 h-6 text-ghost" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm text-ghost">Queue is empty</p>
            <p className="text-xs text-ghost/50 mt-0.5">Start typing a venue name above</p>
          </div>
        </div>
      )}
    </div>
  );
}
