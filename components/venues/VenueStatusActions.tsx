'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VenueStatus } from '@/types/venue';

const NEXT_ACTIONS: Record<VenueStatus, { status: VenueStatus; label: string; className: string }[]> = {
  draft: [
    { status: 'approved', label: 'Approve', className: 'bg-blue-600 text-white hover:bg-blue-700' },
    { status: 'published', label: 'Publish Now', className: 'bg-green-600 text-white hover:bg-green-700' },
    { status: 'archived', label: 'Archive', className: 'border border-gray-300 text-gray-600 hover:bg-gray-50' },
  ],
  approved: [
    { status: 'published', label: 'Publish', className: 'bg-green-600 text-white hover:bg-green-700' },
    { status: 'draft', label: 'Move to Draft', className: 'border border-gray-300 text-gray-600 hover:bg-gray-50' },
    { status: 'archived', label: 'Archive', className: 'border border-gray-300 text-gray-600 hover:bg-gray-50' },
  ],
  published: [
    { status: 'archived', label: 'Archive', className: 'border border-gray-300 text-gray-600 hover:bg-gray-50' },
    { status: 'draft', label: 'Unpublish', className: 'border border-gray-300 text-red-600 hover:bg-red-50' },
  ],
  archived: [
    { status: 'draft', label: 'Restore to Draft', className: 'border border-gray-300 text-gray-600 hover:bg-gray-50' },
  ],
};

interface VenueStatusActionsProps {
  venueId: string;
  currentStatus: VenueStatus;
  adminUserId: string;
  venue: {
    lat: number | null;
    lng: number | null;
    google_place_id: string | null;
    sub_category: string | null;
  };
}

function validateForPublish(venue: VenueStatusActionsProps['venue']): string[] {
  const missing: string[] = [];
  if (!venue.lat || !venue.lng)   missing.push('location (lat/lng)');
  if (!venue.google_place_id)     missing.push('Google Place ID');
  if (!venue.sub_category)        missing.push('sub-category');
  return missing;
}

export default function VenueStatusActions({
  venueId,
  currentStatus,
  venue,
}: VenueStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<VenueStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = NEXT_ACTIONS[currentStatus] ?? [];

  async function changeStatus(newStatus: VenueStatus) {
    setError(null);

    if (newStatus === 'published') {
      const missing = validateForPublish(venue);
      if (missing.length > 0) {
        setError(`Cannot publish — missing: ${missing.join(', ')}`);
        return;
      }
    }

    setLoading(newStatus);

    const res = await fetch(`/api/venues/${venueId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await res.json();
    setLoading(null);

    if (!res.ok) {
      setError(data.error ?? 'Failed to update status.');
      return;
    }

    router.refresh();
  }

  if (actions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Actions:</span>
        {actions.map(action => (
          <button
            key={action.status}
            onClick={() => changeStatus(action.status)}
            disabled={loading !== null}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${action.className}`}
          >
            {loading === action.status ? 'Updating...' : action.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
