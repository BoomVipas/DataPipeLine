import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchApprovalPhotos } from '@/lib/autofill/photos';
import type { VenueStatus } from '@/types/venue';

const VALID_TRANSITIONS: Record<VenueStatus, VenueStatus[]> = {
  draft: ['approved', 'published', 'archived'],
  approved: ['published', 'draft', 'archived'],
  published: ['archived', 'draft'],
  archived: ['draft'],
};

/** Sync a published venue to the activity table (what the mobile app reads) */
async function syncToActivity(
  venueId: string,
  adminUserId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single();

  if (!venue) throw new Error('Venue not found');

  const activityPayload = {
    name: venue.name,
    category_id: venue.category_id ?? null,
    created_by: adminUserId,
    is_verified: true,
    is_temporary: false,
    google_place_id: venue.google_place_id ?? null,
    opening_hours: venue.opening_hours ?? null,
    price_level: venue.price_level ?? null,
    crowd_level: null,
    vibe_stats: null,
    usage_count: 0,
    last_used_at: null,
    lat: venue.lat ?? null,
    lng: venue.lng ?? null,
    rating: venue.rating ?? null,
    rating_count: venue.rating_count ?? null,
    price_thb: venue.price_thb ?? null,
    short_description: venue.short_description ?? null,
    long_description: venue.long_description ?? null,
    features: venue.features ?? null,
    facilities: venue.facilities ?? null,
  };

  // Re-publish: update existing activity row
  if (venue.activity_id) {
    const { error } = await supabase
      .from('activity')
      .update(activityPayload)
      .eq('id', venue.activity_id);
    if (error) throw error;
    return venue.activity_id as string;
  }

  // First publish: insert new activity row
  const { data, error } = await supabase
    .from('activity')
    .insert(activityPayload)
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, display_name')
    .eq('user_id', user.id)
    .single();
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status: newStatus } = await req.json() as { status: VenueStatus };

  const { data: current } = await supabase
    .from('venues')
    .select('status, activity_id, name, lat, lng, google_place_id, photo_urls')
    .eq('id', id)
    .single();

  if (!current) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

  const allowed = VALID_TRANSITIONS[current.status as VenueStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${current.status} to ${newStatus}` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: newStatus,
    updated_by: adminUser.id,
  };

  if (newStatus === 'approved' || newStatus === 'published') {
    update.approved_by = adminUser.id;
    update.approved_at = now;
  }

  if (newStatus === 'published') {
    try {
      const activityId = await syncToActivity(id, adminUser.id, supabase);
      update.published_by = adminUser.id;
      update.published_at = now;
      update.activity_id = activityId;
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? JSON.stringify(err);
      return NextResponse.json({ error: `Failed to publish: ${msg}` }, { status: 500 });
    }
  }

  // Unpublish: hide from mobile app (set is_verified = false)
  if ((newStatus === 'archived' || newStatus === 'draft') && current.activity_id) {
    await supabase
      .from('activity')
      .update({ is_verified: false })
      .eq('id', current.activity_id);
  }

  const { error } = await supabase.from('venues').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // --- Photo fetch on first approval (draft → approved, no photos yet) ---
  if (
    newStatus === 'approved' &&
    current.status === 'draft' &&
    (!current.photo_urls || (current.photo_urls as string[]).length === 0)
  ) {
    try {
      const { photoUrls, placeId } = await fetchApprovalPhotos(
        id,
        current.name as string,
        supabase,
        {
          lat: current.lat as number | null,
          lng: current.lng as number | null,
          existingPlaceId: current.google_place_id as string | null,
        },
      );

      if (photoUrls.length > 0) {
        const photoUpdate: Record<string, unknown> = { photo_urls: photoUrls };
        // Set hero image only if none exists yet
        if (!current.photo_urls) photoUpdate.hero_image_url = photoUrls[0];
        // Cache the place ID to avoid re-searching on future calls
        if (placeId && !current.google_place_id) photoUpdate.google_place_id = placeId;
        await supabase.from('venues').update(photoUpdate).eq('id', id);
      }
    } catch {
      // Non-blocking — approval succeeds even if photo fetch fails
    }
  }

  await supabase.from('venue_notes').insert({
    venue_id: id,
    author_id: adminUser.id,
    note_type: 'status_change',
    content: `${adminUser.display_name} changed status: ${current.status} → ${newStatus}`,
    metadata: { old_status: current.status, new_status: newStatus },
  });

  return NextResponse.json({ success: true, status: newStatus });
}
