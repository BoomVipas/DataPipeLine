'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PhotoManagerProps {
  venueId: string;
  initialPhotos: string[];
}

export default function PhotoManager({ venueId, initialPhotos }: PhotoManagerProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [savedPhotos, setSavedPhotos] = useState<string[]>(initialPhotos);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPhotos(initialPhotos);
    setSavedPhotos(initialPhotos);
    setDragIndex(null);
    setSaved(false);
  }, [initialPhotos]);

  const isDirty = useMemo(
    () => JSON.stringify(photos) !== JSON.stringify(savedPhotos),
    [photos, savedPhotos]
  );

  function onDragStart(index: number) {
    setDragIndex(index);
  }

  function onDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...photos];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setPhotos(next);
    setDragIndex(null);
    setSaved(false);
  }

  function onDelete(index: number) {
    setPhotos(photos.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);

    try {
      const res = await fetch(`/api/venues/${venueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero_image_url: photos[0] ?? null,
          photo_urls: photos,
        }),
      });

      if (!res.ok) {
        alert('Failed to save photo order. Please try again.');
        return;
      }

      setSavedPhotos(photos);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Failed to save photo order. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-dim uppercase tracking-wider">Photos</h3>
        {(isDirty || saved) && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-flame text-white rounded-lg hover:bg-flame/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save order'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {photos.map((url, i) => (
          <div
            key={`${url}-${i}`}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(i)}
            className={`relative group aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing bg-raised border border-white/[0.07] ${
              dragIndex === i ? 'opacity-40 ring-2 ring-flame' : ''
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />

            {i === 0 && (
              <span className="absolute bottom-1 left-1 text-[10px] font-semibold bg-flame text-white px-1.5 py-0.5 rounded">
                Hero
              </span>
            )}

            <button
              type="button"
              onClick={() => onDelete(i)}
              className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-black/60 hover:bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="absolute top-1 left-1 w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-60 transition-all">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm6 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm6 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {photos.length === 0 && (
        <p className="text-xs text-ghost py-4 text-center">No photos available.</p>
      )}
    </div>
  );
}
