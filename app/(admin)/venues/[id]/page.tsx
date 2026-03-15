import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import VenueStatusActions from '@/components/venues/VenueStatusActions';
import VenueNotes from '@/components/venues/VenueNotes';
import VenueMobilePreview from '@/components/venues/VenueMobilePreview';
import type { Venue, VenueNote } from '@/types/venue';
import { SUB_CATEGORY_LABELS, CATEGORY_ICONS, SUB_CATEGORY_ICONS } from '@/lib/utils/categories';
import QuickFillPanel from '@/components/venues/QuickFillPanel';
import DeleteVenueButton from '@/components/venues/DeleteVenueButton';
import PhotoManager from '@/components/venues/PhotoManager';

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, display_name')
    .eq('user_id', user.id)
    .single();

  const [{ data: venue }, { data: notes }, { data: categoriesData }] = await Promise.all([
    supabase
      .from('venues')
      .select('*, category:category(id,name,key,icon_key)')
      .eq('id', id)
      .eq('is_deleted', false)
      .single(),
    supabase
      .from('venue_notes')
      .select('*, author:admin_users(display_name)')
      .eq('venue_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('category')
      .select('id, name, key')
      .eq('level', 1)
      .order('sort_order'),
  ]);

  if (!venue) notFound();

  const v = venue as Venue;
  const priceSymbols = ['฿', '฿฿', '฿฿฿', '฿฿฿฿'];
  const allPhotos = Array.from(new Set([
    ...(v.hero_image_url ? [v.hero_image_url] : []),
    ...((v.photo_urls ?? []).filter(url => url !== v.hero_image_url)),
  ]));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/venues" className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{v.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="status" status={v.status} />
              {v.category && (
                <Badge
                  variant="category"
                  categoryKey={v.category.key}
                  categoryName={v.category.name}
                />
              )}
              {v.sub_category && (
                <span className="text-xs text-gray-500 capitalize">
                  {SUB_CATEGORY_LABELS[v.sub_category]}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/venues/${id}/edit`}
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit
          </Link>
          <DeleteVenueButton venueId={id} venueName={v.name} />
        </div>
      </div>

      {/* Status Actions */}
      {adminUser && (
        <VenueStatusActions
          venueId={id}
          currentStatus={v.status}
          adminUserId={adminUser.id}
          venue={{
            lat: v.lat ?? null,
            lng: v.lng ?? null,
            google_place_id: v.google_place_id ?? null,
            sub_category: v.sub_category ?? null,
          }}
        />
      )}

      {/* Quick-fill missing fields */}
      <QuickFillPanel
        venue={v}
        categories={categoriesData ?? []}
      />

      <div className="bg-card border border-white/[0.07] rounded-xl p-4">
        <PhotoManager venueId={v.id} initialPhotos={allPhotos} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          {v.short_description && (
            <InfoCard title="Description">
              <p className="text-sm text-gray-700 leading-relaxed">{v.short_description}</p>
              {v.long_description && (
                <p className="text-sm text-gray-600 leading-relaxed mt-2">{v.long_description}</p>
              )}
            </InfoCard>
          )}

          {/* Location */}
          <InfoCard title="Location">
            <InfoRow label="Address" value={v.address} />
            <InfoRow label="District" value={v.district} />
            <InfoRow label="Nearest BTS/MRT" value={v.nearest_bts_mrt} />
            {v.lat && v.lng && (
              <InfoRow label="Coordinates" value={`${v.lat}, ${v.lng}`} />
            )}
          </InfoCard>

          {/* Features & Facilities */}
          {(v.features?.length || v.facilities?.length) ? (
            <InfoCard title="Features & Facilities">
              {v.features && v.features.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Features</p>
                  <div className="flex flex-wrap gap-1">
                    {v.features.map(f => (
                      <span key={f} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {v.facilities && v.facilities.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Facilities</p>
                  <div className="flex flex-wrap gap-1">
                    {v.facilities.map(f => (
                      <span key={f} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </InfoCard>
          ) : null}

          {/* Hours */}
          {v.opening_hours && (
            <InfoCard title="Opening Hours">
              <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map(day => {
                  const slots = v.opening_hours?.[day] ?? [];
                  return (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium capitalize">{day.slice(0, 3)}</span>
                      <span className="text-gray-900">
                        {slots.length === 0
                          ? 'Closed'
                          : slots.map(s => `${s.open}–${s.close}`).join(', ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </InfoCard>
          )}
        </div>

        {/* App Preview — sticky panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <VenueMobilePreview venue={v} />
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-5">
          <InfoCard title="Contact">
            {v.phone && <InfoRow label="Phone" value={v.phone} />}
            {v.website_url && (
              <InfoRow
                label="Website"
                value={
                  <a href={v.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">
                    {v.website_url}
                  </a>
                }
              />
            )}
            {v.instagram_url && (
              <InfoRow
                label="Instagram"
                value={<a href={v.instagram_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Instagram</a>}
              />
            )}
            {v.facebook_url && (
              <InfoRow
                label="Facebook"
                value={<a href={v.facebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Facebook</a>}
              />
            )}
            {v.line_id && <InfoRow label="LINE" value={v.line_id} />}
          </InfoCard>

          <InfoCard title="Details">
            {v.price_level && <InfoRow label="Level" value={priceSymbols[v.price_level - 1]} />}
            {v.price_thb && <InfoRow label="Price" value={`${v.price_thb.toLocaleString()}฿`} />}
            {v.booking_method && <InfoRow label="Booking" value={v.booking_method.replace('_', ' ')} />}
            {v.rating && <InfoRow label="Rating" value={`${v.rating}★ (${v.rating_count?.toLocaleString()} reviews)`} />}
          </InfoCard>

          {(v.category || v.sub_category) && (
            <InfoCard title="Category">
              <div className="flex gap-5 pt-1">
                {v.category && (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                      {CATEGORY_ICONS[v.category.key] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={CATEGORY_ICONS[v.category.key]} alt={v.category.name} className="w-9 h-9 object-contain" />
                      ) : (
                        <span className="text-xl">📍</span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-gray-700">{v.category.name}</span>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wide">Category</span>
                  </div>
                )}
                {v.sub_category && (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                      {SUB_CATEGORY_ICONS[v.sub_category] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={SUB_CATEGORY_ICONS[v.sub_category]} alt={v.sub_category} className="w-9 h-9 object-contain" />
                      ) : (
                        <span className="text-xl">🏷</span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-gray-700">{SUB_CATEGORY_LABELS[v.sub_category as keyof typeof SUB_CATEGORY_LABELS] ?? v.sub_category}</span>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wide">Type</span>
                  </div>
                )}
              </div>
            </InfoCard>
          )}

          <InfoCard title="Pipeline">
            <InfoRow label="Status" value={<Badge variant="status" status={v.status} />} />
            <InfoRow
              label="Created"
              value={new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            />
            {v.approved_at && (
              <InfoRow
                label="Approved"
                value={new Date(v.approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              />
            )}
            {v.published_at && (
              <InfoRow
                label="Published"
                value={new Date(v.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              />
            )}
            {v.slug && (
              <InfoRow
                label="Slug"
                value={<code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{v.slug}</code>}
              />
            )}
            {v.activity_id && (
              <InfoRow
                label="Activity ID"
                value={<code className="text-xs bg-green-50 text-green-700 px-1 py-0.5 rounded">{v.activity_id.slice(0, 8)}…</code>}
              />
            )}
          </InfoCard>
        </div>
      </div>

      {/* Activity Log + Notes */}
      {adminUser && (
        <VenueNotes
          venueId={id}
          initialNotes={notes as VenueNote[] ?? []}
          adminUserId={adminUser.id}
        />
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-gray-600 shrink-0 font-medium">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  );
}
