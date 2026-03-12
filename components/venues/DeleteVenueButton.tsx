'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteVenueButtonProps {
  venueId: string;
  venueName: string;
}

export default function DeleteVenueButton({ venueId, venueName }: DeleteVenueButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);

    try {
      const res = await fetch(`/api/venues/${venueId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/venues');
        router.refresh();
        return;
      }
    } catch {
      // handled below
    }

    setDeleting(false);
    setConfirming(false);
    alert('Failed to delete venue. Please try again.');
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ghost hover:text-red-400 border border-white/[0.07] hover:border-red-400/30 rounded-lg transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
      <span className="text-xs text-red-400">Delete &quot;{venueName}&quot;?</span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="px-2 py-1 text-xs font-semibold bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
      >
        {deleting ? 'Deleting…' : 'Confirm'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="px-2 py-1 text-xs text-ghost hover:text-ink transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
