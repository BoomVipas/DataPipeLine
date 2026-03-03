'use client';

import { useState } from 'react';
import type { VenueNote } from '@/types/venue';

interface VenueNotesProps {
  venueId: string;
  initialNotes: VenueNote[];
  adminUserId: string;
}

const NOTE_TYPE_STYLES: Record<VenueNote['note_type'], string> = {
  comment: 'bg-gray-200',
  status_change: 'bg-blue-200',
  autofill_log: 'bg-purple-200',
  edit_log: 'bg-amber-200',
};

export default function VenueNotes({ venueId, initialNotes }: VenueNotesProps) {
  const [notes, setNotes] = useState<VenueNote[]>(initialNotes);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function addComment() {
    if (!comment.trim()) return;
    setSubmitting(true);

    const res = await fetch(`/api/venues/${venueId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment.trim() }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (res.ok && data.note) {
      setNotes([data.note, ...notes]);
      setComment('');
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Activity Log</h3>

      {/* Add comment */}
      <div className="flex gap-3">
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={2}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              addComment();
            }
          }}
        />
        <button
          onClick={addComment}
          disabled={submitting || !comment.trim()}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors self-end"
        >
          {submitting ? 'Adding...' : 'Add'}
        </button>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {notes.length === 0 && (
          <p className="text-sm text-gray-400">No activity yet.</p>
        )}
        {notes.map(note => (
          <div key={note.id} className="flex gap-3">
            <div
              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${NOTE_TYPE_STYLES[note.note_type]}`}
            />
            <div className="flex-1">
              <p className="text-sm text-gray-700">{note.content}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {note.author?.display_name ?? 'System'} ·{' '}
                {new Date(note.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
