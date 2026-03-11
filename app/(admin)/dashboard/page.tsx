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
  Fitness:    { bg: 'bg-orange-400/10',  text: 'text-orange-400',  bar: 'bg-orange-400' },
  Outdoors:   { bg: 'bg-lime-400/10',    text: 'text-lime-400',    bar: 'bg-lime-400' },
  Workshops:  { bg: 'bg-yellow-400/10',  text: 'text-yellow-400',  bar: 'bg-yellow-400' },
  Arts:       { bg: 'bg-pink-400/10',    text: 'text-pink-400',    bar: 'bg-pink-400' },
  Wellness:   { bg: 'bg-emerald-400/10', text: 'text-emerald-400', bar: 'bg-emerald-400' },
  Bouldering: { bg: 'bg-amber-400/10',   text: 'text-amber-400',   bar: 'bg-amber-400' },
  Yoga:       { bg: 'bg-teal-400/10',    text: 'text-teal-400',    bar: 'bg-teal-400' },
  Social:     { bg: 'bg-violet-400/10',  text: 'text-violet-400',  bar: 'bg-violet-400' },
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

  const statusCounts: Record<VenueStatus, number> = {
    draft: 0, approved: 0, published: 0, archived: 0,
  };
  const categoryCounts: Record<string, number> = {};
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

  const subCatData: SubCatData[] = Object.entries(SUB_CATEGORY_GROUP).map(([name, group]) => ({
    name,
    value: subCatCounts[name] ?? 0,
    group,
  }));

  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const maxCatCount = Math.max(...topCategories.map(([, c]) => c), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between pt-1">
        <div>
          <p className="text-xs text-ghost uppercase tracking-widest font-medium mb-1">Wander Ops</p>
          <h1 className="text-2xl font-bold font-display text-ink tracking-tight">Overview</h1>
        </div>
        <Link
          href="/venues/new"
          className="flex items-center gap-2 px-4 py-2 bg-flame text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Venue
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total" value={totalVenues} color="neutral" />
        <StatCard label="Published" value={statusCounts.published} color="green" />
        <StatCard label="Approved" value={statusCounts.approved} color="blue" />
        <StatCard label="Draft" value={statusCounts.draft} color="amber" />
        <StatCard label="Archived" value={statusCounts.archived} color="ghost" />
      </div>

      {/* Pipeline Progress */}
      <div className="bg-card rounded-xl border border-white/[0.07] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-ink font-display">Pipeline</h2>
            <p className="text-xs text-ghost mt-0.5">Venue status distribution</p>
          </div>
          <span className="text-sm font-bold text-emerald-400 font-display">{publishedPct}%<span className="text-xs font-normal text-ghost ml-1">published</span></span>
        </div>

        {/* Stacked bar */}
        <div className="flex rounded-lg overflow-hidden h-5 bg-white/[0.05]">
          {totalVenues > 0 && (
            <>
              <div style={{ width: `${(statusCounts.published / totalVenues) * 100}%` }} className="bg-emerald-400 transition-all" title="Published" />
              <div style={{ width: `${(statusCounts.approved / totalVenues) * 100}%` }} className="bg-blue-400 transition-all" title="Approved" />
              <div style={{ width: `${(statusCounts.draft / totalVenues) * 100}%` }} className="bg-amber-400 transition-all" title="Draft" />
              <div style={{ width: `${(statusCounts.archived / totalVenues) * 100}%` }} className="bg-white/20 transition-all" title="Archived" />
            </>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-5 mt-3">
          {[
            { label: 'Published', color: 'bg-emerald-400', count: statusCounts.published },
            { label: 'Approved',  color: 'bg-blue-400',    count: statusCounts.approved },
            { label: 'Draft',     color: 'bg-amber-400',   count: statusCounts.draft },
            { label: 'Archived',  color: 'bg-white/20',    count: statusCounts.archived },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className="text-xs text-ghost">{s.label}</span>
              <span className="text-xs font-semibold text-ink">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Half Pie */}
        <div className="bg-card rounded-xl border border-white/[0.07] p-5">
          <h2 className="text-sm font-semibold text-ink font-display mb-0.5">Sub-category Breakdown</h2>
          <p className="text-xs text-ghost mb-4">Distribution by sub-category</p>
          <SubCategoryChart data={subCatData} total={totalVenues} />
        </div>

        {/* Category bar chart */}
        <div className="bg-card rounded-xl border border-white/[0.07] p-5">
          <h2 className="text-sm font-semibold text-ink font-display mb-0.5">Category Coverage</h2>
          <p className="text-xs text-ghost mb-5">Venues per category</p>
          <div className="space-y-4">
            {topCategories.map(([name, count]) => {
              const colors = CATEGORY_COLORS[name] ?? { bg: 'bg-white/[0.07]', text: 'text-dim', bar: 'bg-white/20' };
              const pct = Math.round((count / maxCatCount) * 100);
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-dim">{name}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                      {count}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${colors.bar} transition-all`}
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
      <div className="bg-card rounded-xl border border-white/[0.07] p-5">
        <h2 className="text-sm font-semibold text-ink font-display mb-4">Recent Activity</h2>
        {(!recentNotes || recentNotes.length === 0) ? (
          <p className="text-sm text-ghost">No activity yet.</p>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {(recentNotes as unknown as {
              id: string;
              content: string;
              created_at: string;
              note_type: string;
              venue: { id: string; name: string } | null;
              author: { display_name: string } | null;
            }[]).map((note) => (
              <div key={note.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                  note.note_type === 'status_change' ? 'bg-blue-400' :
                  note.note_type === 'autofill_log'  ? 'bg-emerald-400' : 'bg-white/20'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dim leading-snug truncate">{note.content}</p>
                  <p className="text-xs text-ghost mt-1 flex items-center gap-1">
                    {note.venue && (
                      <Link href={`/venues/${note.venue.id}`} className="hover:text-ink transition-colors text-dim">
                        {note.venue.name}
                      </Link>
                    )}
                    {note.venue && <span className="text-ghost/50">·</span>}
                    <span>{note.author?.display_name}</span>
                    <span className="text-ghost/50">·</span>
                    <span>
                      {new Date(note.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
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
  label: string;
  value: number;
  color: 'green' | 'blue' | 'amber' | 'neutral' | 'ghost';
}) {
  const styles = {
    green:   { num: 'text-emerald-400', glow: 'from-emerald-400/[0.07]', dot: 'bg-emerald-400' },
    blue:    { num: 'text-blue-400',    glow: 'from-blue-400/[0.07]',    dot: 'bg-blue-400' },
    amber:   { num: 'text-amber-400',   glow: 'from-amber-400/[0.07]',   dot: 'bg-amber-400' },
    neutral: { num: 'text-ink',         glow: 'from-white/[0.04]',       dot: 'bg-white/30' },
    ghost:   { num: 'text-dim',         glow: 'from-white/[0.02]',       dot: 'bg-white/20' },
  }[color];

  return (
    <div className={`relative bg-card rounded-xl border border-white/[0.07] p-5 overflow-hidden bg-gradient-to-br ${styles.glow} to-transparent`}>
      <p className={`text-2xl font-bold font-display ${styles.num}`}>{value}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
        <span className="text-xs font-medium text-ghost uppercase tracking-wide">{label}</span>
      </div>
    </div>
  );
}
