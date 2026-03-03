import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import type { VenueStatus } from '@/types/venue';

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
  if (q) query = query.ilike('name', `%${q}%`);

  const { data: venues, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  function buildUrl(overrides: Partial<SearchParams>) {
    const params = new URLSearchParams();
    const merged = { status, category_id, q, page: String(page), ...overrides };
    if (merged.status && merged.status !== 'all') params.set('status', merged.status);
    if (merged.category_id) params.set('category_id', merged.category_id);
    if (merged.q) params.set('q', merged.q);
    if (merged.page && merged.page !== '1') params.set('page', merged.page);
    const qs = params.toString();
    return `/venues${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Venues</h1>
        <Link href="/venues/new" className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
          Add Venue
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-1">
          {STATUS_TABS.map(tab => (
            <Link
              key={tab.value}
              href={buildUrl({ status: tab.value, page: '1' })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                status === tab.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-3">
          <form className="flex-1" method="get" action="/venues">
            {status !== 'all' && <input type="hidden" name="status" value={status} />}
            {category_id && <input type="hidden" name="category_id" value={category_id} />}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search venues..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {(!venues || venues.length === 0) ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No venues found.{' '}
            <Link href="/venues/new" className="text-gray-900 underline">Add one</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Venue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">District</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Google</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(venues as unknown as VenueListRow[]).map(venue => (
                <tr key={venue.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {venue.hero_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={venue.hero_image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                      )}
                      <span className="font-medium text-gray-900">{venue.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {venue.category && (
                      <div className="flex flex-col gap-1">
                        <Badge variant="category" categoryKey={venue.category.key} categoryName={venue.category.name} />
                        {venue.sub_category && (
                          <span className="text-xs text-gray-400 capitalize">{venue.sub_category}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{venue.district ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="status" status={venue.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {venue.rating ? `${venue.rating}★` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {venue.created_at
                      ? new Date(venue.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/venues/${venue.id}`} className="text-xs text-gray-600 hover:text-gray-900 underline">View</Link>
                      <Link href={`/venues/${venue.id}/edit`} className="text-xs text-gray-600 hover:text-gray-900 underline">Edit</Link>
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
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{from + 1}–{Math.min(from + PAGE_SIZE, count ?? 0)} of {count} venues</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Previous</Link>
            )}
            {page < totalPages && (
              <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Next</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
