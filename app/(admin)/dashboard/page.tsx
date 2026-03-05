import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { VenueStatus } from '@/types/venue';
import SubCategoryChart from '@/components/dashboard/SubCategoryChart';
import type { SubCatData } from '@/components/dashboard/SubCategoryChart';

const SUB_CATEGORY_GROUP: Record<string, string> = {
  indoor: 'fitness', outdoor: 'fitness',
  mindful: 'wellness', recovery: 'wellness',
  games: 'casual', chill: 'casual', wander: 'casual', weird: 'casual',
  bar: 'nightlife', club: 'nightlife',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  Fitness:   { bg: 'bg-orange-50',  text: 'text-orange-700', bar: 'bg-orange-400' },
  Outdoors:  { bg: 'bg-lime-50',    text: 'text-lime-700',   bar: 'bg-lime-400' },
  Workshops: { bg: 'bg-yellow-50',  text: 'text-yellow-700', bar: 'bg-yellow-400' },
  Arts:      { bg: 'bg-pink-50',    text: 'text-pink-700',   bar: 'bg-pink-400' },
  Wellness:  { bg: 'bg-green-50',   text: 'text-green-700',  bar: 'bg-green-400' },
  Bouldering:{ bg: 'bg-amber-50',   text: 'text-amber-700',  bar: 'bg-amber-400' },
  Yoga:      { bg: 'bg-teal-50',    text: 'text-teal-700',   bar: 'bg-teal-400' },
  Social:    { bg: 'bg-purple-50',  text: 'text-purple-700', bar: 'bg-purple-400' },
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: venues }, { data: recentNotes }] = await Promise.all([
    supabase
      .from('venues')
      .select('status, sub_category, category:category(name, key)')
      .eq('is_deleted', false),
    supabase
      .from('venue_notes')
      .select('id, content, created_at, note_type, venue:venues(id, name), author:admin_users(display_name)')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  // Status counts
  const statusCounts: Record<VenueStatus, number> = {
    draft: 0, approved: 0, published: 0, archived: 0,
  };

  // Category counts (by name)
  const categoryCounts: Record<string, number> = {};

  // Sub-category counts
  const subCatCounts: Record<string, number> = {};

  type Row = { status: VenueStatus; sub_category: string | null; category: { name: string; key: string } | null };
  (venues as unknown as Row[] ?? []).forEach(v => {
    statusCounts[v.status] = (statusCounts[v.status] ?? 0) + 1;
    const catName = v.category?.name ?? 'Unknown';
    categoryCounts[catName] = (categoryCounts[catName] ?? 0) + 1;
    if (v.sub_category) {
      subCatCounts[v.sub_category] = (subCatCounts[v.sub_category] ?? 0) + 1;
    }
  });

  const totalVenues = (venues?.length ?? 0);
  const publishedPct = totalVenues > 0 ? Math.round((statusCounts.published / totalVenues) * 100) : 0;

  // Build sub-category chart data
  const subCatData: SubCatData[] = Object.entries(SUB_CATEGORY_GROUP).map(([name, group]) => ({
    name,
    value: subCatCounts[name] ?? 0,
    group,
  }));

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1]);

  const maxCatCount = Math.max(...topCategories.map(([, c]) => c), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total" value={totalVenues} color="gray" />
        <StatCard label="Published" value={statusCounts.published} color="green" />
        <StatCard label="Approved" value={statusCounts.approved} color="blue" />
        <StatCard label="Draft" value={statusCounts.draft} color="yellow" />
        <StatCard label="Archived" value={statusCounts.archived} color="gray" />
      </div>

      {/* Pipeline progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Pipeline Progress</h2>
          <span className="text-xs text-gray-500">{publishedPct}% published</span>
        </div>
        <div className="flex rounded-full overflow-hidden h-3 bg-gray-100">
          {totalVenues > 0 && (
            <>
              <div style={{ width: `${(statusCounts.published / totalVenues) * 100}%` }} className="bg-green-400" title="Published" />
              <div style={{ width: `${(statusCounts.approved / totalVenues) * 100}%` }} className="bg-blue-400" title="Approved" />
              <div style={{ width: `${(statusCounts.draft / totalVenues) * 100}%` }} className="bg-amber-300" title="Draft" />
              <div style={{ width: `${(statusCounts.archived / totalVenues) * 100}%` }} className="bg-gray-300" title="Archived" />
            </>
          )}
        </div>
        <div className="flex gap-4 mt-2">
          {[
            { label: 'Published', color: 'bg-green-400', count: statusCounts.published },
            { label: 'Approved',  color: 'bg-blue-400',  count: statusCounts.approved },
            { label: 'Draft',     color: 'bg-amber-300', count: statusCounts.draft },
            { label: 'Archived',  color: 'bg-gray-300',  count: statusCounts.archived },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              <span className="text-xs text-gray-500">{s.label} <span className="font-medium text-gray-700">{s.count}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Half Pie — Sub-category breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Sub-category Breakdown</h2>
          <p className="text-xs text-gray-400 mb-4">Distribution of venues by sub-category</p>
          <SubCategoryChart data={subCatData} total={totalVenues} />
        </div>

        {/* Category bar chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Category Coverage</h2>
          <p className="text-xs text-gray-400 mb-4">Venues per category (all statuses)</p>
          <div className="space-y-3">
            {topCategories.map(([name, count]) => {
              const colors = CATEGORY_COLORS[name] ?? { bg: 'bg-gray-50', text: 'text-gray-600', bar: 'bg-gray-300' };
              const pct = Math.round((count / maxCatCount) * 100);
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                      {count}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${colors.bar} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h2>
        {(!recentNotes || recentNotes.length === 0) ? (
          <p className="text-sm text-gray-400">No activity yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {(recentNotes as unknown as {
              id: string;
              content: string;
              created_at: string;
              note_type: string;
              venue: { id: string; name: string } | null;
              author: { display_name: string } | null;
            }[]).map((note) => (
              <div key={note.id} className="flex gap-3 py-2.5">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  note.note_type === 'status_change' ? 'bg-blue-400' :
                  note.note_type === 'autofill_log'  ? 'bg-green-400' : 'bg-gray-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{note.content}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {note.venue && (
                      <Link href={`/venues/${note.venue.id}`} className="hover:underline text-gray-500">
                        {note.venue.name}
                      </Link>
                    )}
                    {note.venue && ' · '}
                    {note.author?.display_name} ·{' '}
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
  );
}

function StatCard({ label, value, color }: {
  label: string; value: number; color: 'green' | 'yellow' | 'blue' | 'gray';
}) {
  const colorClasses = {
    green:  'bg-green-50 text-green-700',
    yellow: 'bg-amber-50 text-amber-700',
    blue:   'bg-blue-50 text-blue-700',
    gray:   'bg-gray-50 text-gray-600',
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
