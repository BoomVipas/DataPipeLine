/**
 * Preview page — renders the admin shell with mock data for screenshots.
 * NOT linked from the app. Dev only.
 */
import Link from 'next/link';
import SubCategoryChart from '@/components/dashboard/SubCategoryChart';
import type { SubCatData } from '@/components/dashboard/SubCategoryChart';

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

const mockSubCatData: SubCatData[] = [
  { name: 'indoor',   value: 18, group: 'fitness' },
  { name: 'outdoor',  value: 12, group: 'fitness' },
  { name: 'mindful',  value: 9,  group: 'wellness' },
  { name: 'recovery', value: 6,  group: 'wellness' },
  { name: 'games',    value: 14, group: 'casual' },
  { name: 'chill',    value: 11, group: 'casual' },
  { name: 'wander',   value: 5,  group: 'casual' },
  { name: 'weird',    value: 4,  group: 'casual' },
  { name: 'bar',      value: 8,  group: 'nightlife' },
  { name: 'club',     value: 6,  group: 'nightlife' },
];

const mockCategories = [
  ['Fitness', 30], ['Outdoors', 24], ['Wellness', 21],
  ['Social', 17], ['Arts', 14], ['Workshops', 10],
  ['Yoga', 8], ['Bouldering', 5],
] as [string, number][];

const mockNotes = [
  { id: '1', note_type: 'autofill_log',  content: 'Autofilled from Google Places — Muay Thai Lab, Ekkamai', created_at: new Date(Date.now() - 3_600_000).toISOString(), venue: { id: '1', name: 'Muay Thai Lab' }, author: { display_name: 'Vipas' } },
  { id: '2', note_type: 'status_change', content: 'Status changed: draft → approved', created_at: new Date(Date.now() - 7_200_000).toISOString(), venue: { id: '2', name: 'Paper Spoons' }, author: { display_name: 'Vipas' } },
  { id: '3', note_type: 'autofill_log',  content: 'Gemini description generated for The Jam Factory', created_at: new Date(Date.now() - 86_400_000).toISOString(), venue: { id: '3', name: 'The Jam Factory' }, author: { display_name: 'System' } },
  { id: '4', note_type: 'status_change', content: 'Status changed: approved → published', created_at: new Date(Date.now() - 172_800_000).toISOString(), venue: { id: '4', name: 'Ploymitr Billiard' }, author: { display_name: 'Vipas' } },
];

export default function PreviewPage() {
  const statusCounts = { published: 23, approved: 14, draft: 31, archived: 7 };
  const total = 75;
  const publishedPct = Math.round((statusCounts.published / total) * 100);
  const maxCat = Math.max(...mockCategories.map(([, c]) => c));

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/[0.07] bg-panel flex flex-col h-full">
        <div className="px-5 py-[18px] border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-flame flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <span className="font-display text-sm font-bold tracking-wide text-ink uppercase">Wander</span>
            <span className="ml-auto text-[9px] font-medium text-ghost uppercase tracking-widest">ops</span>
          </div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-white/[0.08] text-ink">
            <span className="text-flame">
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
              </svg>
            </span>
            Dashboard
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-flame" />
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-dim">
            <span className="text-ghost">
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </span>
            Venues
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-dim">
            <span className="text-ghost">
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-6.837m5.686 5.686l4.655-5.653a2.548 2.548 0 00-3.586-3.586l-6.837 6.837" />
              </svg>
            </span>
            Refetch Tool
          </div>
        </nav>
        <div className="px-3 pb-5">
          <div className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-flame text-white text-sm font-semibold rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Venue
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-white/[0.07] bg-panel flex items-center justify-end px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-flame/[0.15] border border-flame/30 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-flame font-display">VP</span>
              </div>
              <span className="text-sm text-dim font-medium">Vipas P.</span>
            </div>
            <div className="w-px h-4 bg-white/[0.1]" />
            <span className="text-xs text-ghost tracking-widest uppercase font-medium">Sign out</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-canvas">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Page header */}
            <div className="flex items-end justify-between pt-1">
              <div>
                <p className="text-xs text-ghost uppercase tracking-widest font-medium mb-1">Wander Ops</p>
                <h1 className="text-2xl font-bold font-display text-ink tracking-tight">Overview</h1>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-flame text-white text-sm font-semibold rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Venue
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-5 gap-3">
              {([
                { label: 'Total',     value: total,                    color: 'neutral' },
                { label: 'Published', value: statusCounts.published,   color: 'green' },
                { label: 'Approved',  value: statusCounts.approved,    color: 'blue' },
                { label: 'Draft',     value: statusCounts.draft,       color: 'amber' },
                { label: 'Archived',  value: statusCounts.archived,    color: 'ghost' },
              ] as const).map(card => {
                const styles = {
                  green:   { num: 'text-emerald-400', glow: 'from-emerald-400/[0.07]', dot: 'bg-emerald-400' },
                  blue:    { num: 'text-blue-400',    glow: 'from-blue-400/[0.07]',    dot: 'bg-blue-400' },
                  amber:   { num: 'text-amber-400',   glow: 'from-amber-400/[0.07]',   dot: 'bg-amber-400' },
                  neutral: { num: 'text-ink',         glow: 'from-white/[0.04]',       dot: 'bg-white/30' },
                  ghost:   { num: 'text-dim',         glow: 'from-white/[0.02]',       dot: 'bg-white/20' },
                }[card.color];
                return (
                  <div key={card.label} className={`relative bg-card rounded-xl border border-white/[0.07] p-5 overflow-hidden bg-gradient-to-br ${styles.glow} to-transparent`}>
                    <p className={`text-2xl font-bold font-display ${styles.num}`}>{card.value}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                      <span className="text-xs font-medium text-ghost uppercase tracking-wide">{card.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pipeline */}
            <div className="bg-card rounded-xl border border-white/[0.07] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-ink font-display">Pipeline</h2>
                  <p className="text-xs text-ghost mt-0.5">Venue status distribution</p>
                </div>
                <span className="text-sm font-bold text-emerald-400 font-display">{publishedPct}%<span className="text-xs font-normal text-ghost ml-1">published</span></span>
              </div>
              <div className="flex rounded-lg overflow-hidden h-5 bg-white/[0.05]">
                <div style={{ width: `${(statusCounts.published / total) * 100}%` }} className="bg-emerald-400" />
                <div style={{ width: `${(statusCounts.approved / total) * 100}%` }} className="bg-blue-400" />
                <div style={{ width: `${(statusCounts.draft / total) * 100}%` }} className="bg-amber-400" />
                <div style={{ width: `${(statusCounts.archived / total) * 100}%` }} className="bg-white/20" />
              </div>
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
            <div className="grid grid-cols-2 gap-5">
              <div className="bg-card rounded-xl border border-white/[0.07] p-5">
                <h2 className="text-sm font-semibold text-ink font-display mb-0.5">Sub-category Breakdown</h2>
                <p className="text-xs text-ghost mb-4">Distribution by sub-category</p>
                <SubCategoryChart data={mockSubCatData} total={total} />
              </div>
              <div className="bg-card rounded-xl border border-white/[0.07] p-5">
                <h2 className="text-sm font-semibold text-ink font-display mb-0.5">Category Coverage</h2>
                <p className="text-xs text-ghost mb-5">Venues per category</p>
                <div className="space-y-4">
                  {mockCategories.map(([name, count]) => {
                    const colors = CATEGORY_COLORS[name] ?? { bg: 'bg-white/[0.07]', text: 'text-dim', bar: 'bg-white/20' };
                    const pct = Math.round((count / maxCat) * 100);
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-dim">{name}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>{count}</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className={`h-1.5 rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} />
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
              <div className="divide-y divide-white/[0.05]">
                {mockNotes.map(note => (
                  <div key={note.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                      note.note_type === 'status_change' ? 'bg-blue-400' : 'bg-emerald-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-dim leading-snug truncate">{note.content}</p>
                      <p className="text-xs text-ghost mt-1 flex items-center gap-1">
                        <span className="text-dim">{note.venue.name}</span>
                        <span className="text-ghost/50">·</span>
                        <span>{note.author.display_name}</span>
                        <span className="text-ghost/50">·</span>
                        <span>{new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
