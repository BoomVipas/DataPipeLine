import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import type { VenueStatus } from '@/types/venue';
import { SUB_CATEGORY_LABELS } from '@/lib/utils/categories';

interface VenueListRow {
  id: string;
  name: string;
  category_id: string | null;
  sub_category: string | null;
  district: string | null;
  status: VenueStatus;
  rating: number | null;
  created_at: string;
  hero_image_url: string | null;
  category: { name: string; key: string } | null;
}

const STATUS_TABS: { value: VenueStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const PAGE_SIZE = 20;

interface SearchParams {
  status?: VenueStatus | 'all';
  category_id?: string;
  sub_category?: string;
  q?: string;
  page?: string;
}

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? 'all';
  const category_id = sp.category_id;
  const sub_category = sp.sub_category;
  const q = sp.q ?? '';
  const page = Math.max(1, Number(sp.page ?? 1));
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase
    .from('venues')
    .select('id, name, category_id, sub_category, district, status, rating, created_at, hero_image_url, category:category(name,key)', { count: 'exact' })
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status !== 'all') query = query.eq('status', status);
  if (category_id) query = query.eq('category_id', category_id);
  if (sub_category) query = query.eq('sub_category', sub_category);
  if (q) query = query.ilike('name', `%${q}%`);

  const [{ data: venues, count }, { data: categoryRows }] = await Promise.all([
    query,
    supabase
      .from('category')
      .select('id, name, key, parent_id, level, sort_order')
      .in('level', [1, 2])
      .order('sort_order'),
  ]);

  const rows = categoryRows ?? [];
  const level1 = rows.filter((row): row is typeof row & { parent_id: null } => row.level === 1);
  const level2 = rows.filter((row): row is typeof row & { parent_id: string } => row.level === 2 && !!row.parent_id);

  const categories = level1.map(cat => ({
    id: cat.id,
    name: cat.name,
    sub_categories: level2
      .filter(sub => sub.parent_id === cat.id)
      .map(sub => ({ key: sub.key, name: sub.name })),
  }));

  const selectedCategory = categories.find(category => category.id === category_id);

  const allSubCategoryMap = new Map<string, string>();
  for (const category of categories) {
    for (const sub of category.sub_categories) {
      if (!allSubCategoryMap.has(sub.key)) allSubCategoryMap.set(sub.key, sub.name);
    }
  }

  const validKeys = new Set(Object.keys(SUB_CATEGORY_LABELS));

  const allSubCategories = Array.from(allSubCategoryMap.entries())
    .filter(([key]) => validKeys.has(key))
    .map(([key, name]) => ({ key, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const subCategoryOptions = selectedCategory
    ? (selectedCategory.sub_categories ?? []).filter(sub => validKeys.has(sub.key))
    : allSubCategories;

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  function buildUrl(overrides: Partial<SearchParams>) {
    const params = new URLSearchParams();
    const merged = { status, category_id, sub_category, q, page: String(page), ...overrides };
    if (merged.status && merged.status !== 'all') params.set('status', merged.status);
    if (merged.category_id) params.set('category_id', merged.category_id);
    if (merged.sub_category) params.set('sub_category', merged.sub_category);
    if (merged.q) params.set('q', merged.q);
    if (merged.page && merged.page !== '1') params.set('page', merged.page);
    const qs = params.toString();
    return `/venues${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between pt-1">
        <div>
          <p className="text-xs text-ghost uppercase tracking-widest font-medium mb-1">Wander Ops</p>
          <h1 className="text-2xl font-bold font-display text-ink tracking-tight">Venues</h1>
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

      {/* Filters */}
      <div className="bg-card rounded-xl border border-white/[0.07] p-4 space-y-3">
        {/* Status tabs */}
        <div className="flex gap-1">
          {STATUS_TABS.map(tab => (
            <Link
              key={tab.value}
              href={buildUrl({ status: tab.value, page: '1' })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                status === tab.value
                  ? 'bg-flame text-white'
                  : 'text-dim hover:bg-white/[0.06] hover:text-ink'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Search + category filters */}
        <form className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_auto] gap-3" method="get" action="/venues">
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <input type="hidden" name="page" value="1" />
          <select
            name="category_id"
            defaultValue={category_id ?? ''}
            className="px-3 py-2 text-sm bg-raised border border-white/[0.07] rounded-lg text-ink focus:outline-none focus:border-flame/50 focus:ring-1 focus:ring-flame/30 transition-colors"
          >
            <option value="">All categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select
            name="sub_category"
            defaultValue={sub_category ?? ''}
            className="px-3 py-2 text-sm bg-raised border border-white/[0.07] rounded-lg text-ink focus:outline-none focus:border-flame/50 focus:ring-1 focus:ring-flame/30 transition-colors"
          >
            <option value="">All sub-categories</option>
            {subCategoryOptions.map(sub => (
              <option key={sub.key} value={sub.key}>{sub.name}</option>
            ))}
          </select>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search venues…"
            className="flex-1 px-3 py-2 text-sm bg-raised border border-white/[0.07] rounded-lg text-ink placeholder:text-ghost focus:outline-none focus:border-flame/50 focus:ring-1 focus:ring-flame/30 transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-white/[0.12] text-ink hover:border-flame/50 hover:text-flame transition-colors"
          >
            Apply
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-white/[0.07] overflow-hidden">
        {(!venues || venues.length === 0) ? (
          <div className="py-16 text-center text-ghost text-sm">
            No venues found.{' '}
            <Link href="/venues/new" className="text-flame hover:underline">Add one</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.07]">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-ghost uppercase tracking-widest">Venue</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-ghost uppercase tracking-widest">Category</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-ghost uppercase tracking-widest">District</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-ghost uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-ghost uppercase tracking-widest">Google</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-ghost uppercase tracking-widest">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {(venues as unknown as VenueListRow[]).map(venue => (
                <tr key={venue.id} className="hover:bg-white/[0.025] transition-colors">
                  <td className="p-0">
                    <Link href={`/venues/${venue.id}`} className="flex items-center gap-3 px-4 py-3">
                      {venue.hero_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={venue.hero_image_url} alt="" className="w-9 h-9 rounded-lg object-cover bg-raised shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-raised shrink-0 flex items-center justify-center">
                          <svg className="w-4 h-4 text-ghost" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                          </svg>
                        </div>
                      )}
                      <span className="font-medium text-ink">{venue.name}</span>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/venues/${venue.id}`} className="flex items-center px-4 py-3 h-full">
                      {venue.category && (
                        <div className="flex flex-col gap-1">
                          <Badge variant="category" categoryKey={venue.category.key} categoryName={venue.category.name} />
                          {venue.sub_category && (
                            <span className="text-xs text-ghost capitalize">{venue.sub_category}</span>
                          )}
                        </div>
                      )}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/venues/${venue.id}`} className="flex items-center px-4 py-3 h-full text-dim">{venue.district ?? '—'}</Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/venues/${venue.id}`} className="flex items-center px-4 py-3 h-full">
                      <Badge variant="status" status={venue.status} />
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/venues/${venue.id}`} className="flex items-center px-4 py-3 h-full text-dim">
                      {venue.rating ? (
                        <span className="flex items-center gap-1">
                          <span className="text-sun text-xs">★</span>
                          {venue.rating}
                        </span>
                      ) : '—'}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/venues/${venue.id}`} className="flex items-center px-4 py-3 h-full text-ghost text-xs">
                      {venue.created_at
                        ? new Date(venue.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/venues/${venue.id}/edit`} className="text-xs text-ghost hover:text-flame transition-colors">Edit</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-ghost">{from + 1}–{Math.min(from + PAGE_SIZE, count ?? 0)} of {count} venues</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1.5 border border-white/[0.07] rounded-lg text-dim hover:text-ink hover:bg-white/[0.04] transition-all text-sm">Previous</Link>
            )}
            {page < totalPages && (
              <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1.5 border border-white/[0.07] rounded-lg text-dim hover:text-ink hover:bg-white/[0.04] transition-all text-sm">Next</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
