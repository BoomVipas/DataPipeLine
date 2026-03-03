import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { VenueStatus } from '@/types/venue';

const CATEGORY_LIST = [
  { slug: 'fitness',   label: 'Fitness',    sub: 'Indoor · Outdoor' },
  { slug: 'wellness',  label: 'Wellness',   sub: 'Meditation · Recovery' },
  { slug: 'casual',    label: 'Casual',     sub: 'Chill · Game' },
  { slug: 'nightlife', label: 'Night Life', sub: 'Club · Bar' },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: venues },
    { data: recentNotes },
  ] = await Promise.all([
    supabase
      .from('venues')
      .select('status, category:category(key)')
      .eq('is_deleted', false),
    supabase
      .from('venue_notes')
      .select('*, venue:venues(name), author:admin_users(display_name)')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const statusCounts: Record<VenueStatus, number> = {
    draft: 0, approved: 0, published: 0, archived: 0,
  };
  const categoryCounts: Record<string, number> = {};

  (venues as unknown as { status: VenueStatus; category: { key: string } | null }[] ?? []).forEach(v => {
    statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
    if (v.category?.key) {
      categoryCounts[v.category.key] = (categoryCounts[v.category.key] || 0) + 1;
    }
  });

  const totalPublished = statusCounts.published;
  const inProgress = statusCounts.draft + statusCounts.approved;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <Link
          href="/venues/new"
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Add Venue
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Published" value={totalPublished} color="green" />
        <StatCard label="In Pipeline" value={inProgress} color="yellow" />
        <StatCard label="Approved" value={statusCounts.approved} color="blue" />
        <StatCard label="Archived" value={statusCounts.archived} color="gray" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Coverage */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Category Coverage</h2>
          <div className="space-y-3">
            {CATEGORY_LIST.map(({ slug, label, sub }) => {
              const count = categoryCounts[slug] || 0;
              const isLow = count < 3;
              return (
                <div key={slug} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700">{label}</span>
                    <span className="text-xs text-gray-400 ml-2">{sub}</span>
                  </div>
                  <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                    isLow ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {count} venues
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h2>
          {(!recentNotes || recentNotes.length === 0) ? (
            <p className="text-sm text-gray-400">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {recentNotes.map((note: {
                id: string;
                content: string;
                created_at: string;
                venue: { name: string } | null;
                author: { display_name: string } | null;
              }) => (
                <div key={note.id} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700">{note.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {note.venue?.name} · {note.author?.display_name} ·{' '}
                      {new Date(note.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: {
  label: string; value: number; color: 'green' | 'yellow' | 'blue' | 'gray';
}) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    gray: 'bg-gray-50 text-gray-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <span className={`mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${colorClasses[color]}`}>
        {label}
      </span>
    </div>
  );
}
