import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchApprovalPhotos } from '@/lib/autofill/photos';
import type { VenueStatus } from '@/types/venue';

/** Merge hero + photo_urls into one deduplicated array, hero first */
function buildPhotoArray(hero: string | null, photos: string[] | null): string[] | null {
  const all = [hero, ...(photos ?? [])].filter((u): u is string => !!u);
  const deduped = [...new Set(all)];
  return deduped.length > 0 ? deduped : null;
}

/** VenueSubCategory values that differ from the DB category.key */
const SUB_CATEGORY_KEY_MAP: Record<string, string> = {
  games: 'game',
  recovery: 'recover',
};

async function resolveSubCategoryId(
  subCategory: string | null,
  fallbackCategoryId: string | null,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  if (!subCategory) return fallbackCategoryId;
  const lookupKey = SUB_CATEGORY_KEY_MAP[subCategory] ?? subCategory;
  const { data } = await supabase
    .from('category')
    .select('id')
    .eq('key', lookupKey)
    .single();
  return data?.id ?? fallbackCategoryId;
}

const VALID_TRANSITIONS: Record<VenueStatus, VenueStatus[]> = {
  draft: ['approved', 'published', 'archived'],
  approved: ['published', 'draft', 'archived'],
  published: ['archived', 'draft'],
  archived: ['draft'],
};

/** Sync a published venue to the activity table (what the mobile app reads) */
async function syncToActivity(
  venueId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single();

  if (!venue) throw new Error('Venue not found');

  const categoryId = await resolveSubCategoryId(venue.sub_category, venue.category_id, supabase);
  const combinedPhotos = buildPhotoArray(venue.hero_image_url, venue.photo_urls);

  const activityPayload = {
    name: venue.name,
    category_id: categoryId,
    created_by: null,
    is_verified: true,
    is_temporary: false,
    google_place_id: venue.google_place_id ?? null,
    opening_hours: venue.opening_hours ?? null,
    price_level: venue.price_level ?? null,
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
    photo_urls: combinedPhotos,
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

  const VALID_STATUSES: VenueStatus[] = ['draft', 'approved', 'published', 'archived'];
  if (!VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
  }

  const { data: current } = await supabase
    .from('venues')
    .select('status, activity_id, name, lat, lng, google_place_id, hero_image_url, photo_urls')
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
    // Guardrail: require lat/lng, google_place_id, sub_category before publishing
    const { data: vCheck } = await supabase
      .from('venues')
      .select('lat, lng, google_place_id, sub_category')
      .eq('id', id)
      .single();
    const missing: string[] = [];
    if (!vCheck?.lat || !vCheck?.lng) missing.push('location (lat/lng)');
    if (!vCheck?.google_place_id)     missing.push('Google Place ID');
    if (!vCheck?.sub_category)        missing.push('sub-category');
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Cannot publish — missing: ${missing.join(', ')}` },
        { status: 422 }
      );
    }

    try {
      const activityId = await syncToActivity(id, supabase);
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

  // --- Photo fetch on approval or publish (any transition, no photos yet) ---
  let photoWarning: string | null = null;
  if (
    (newStatus === 'approved' || newStatus === 'published') &&
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
        if (!current.hero_image_url) photoUpdate.hero_image_url = photoUrls[0];
        // Cache the place ID to avoid re-searching on future calls
        if (placeId && !current.google_place_id) photoUpdate.google_place_id = placeId;
        await supabase.from('venues').update(photoUpdate).eq('id', id);

        // Back-fill activity row if venue is published
        const activityId =
          (update.activity_id as string | undefined) ??
          (current.activity_id as string | null ?? undefined);
        if (activityId) {
          const backfillHero = (current.hero_image_url as string | null) ?? photoUrls[0];
          const backfillPhotos = buildPhotoArray(backfillHero, photoUrls);
          await supabase
            .from('activity')
            .update({ photo_urls: backfillPhotos })
            .eq('id', activityId);
        }
      }
    } catch (err) {
      photoWarning = err instanceof Error ? err.message : 'Photo fetch failed';
      console.error('[photos] fetch failed for venue', id, ':', photoWarning);
    }
  }

  await supabase.from('venue_notes').insert({
    venue_id: id,
    author_id: adminUser.id,
    note_type: 'status_change',
    content: `${adminUser.display_name} changed status: ${current.status} → ${newStatus}`,
    metadata: { old_status: current.status, new_status: newStatus },
  });

  return NextResponse.json({
    success: true,
    status: newStatus,
    ...(photoWarning ? { photoWarning } : {}),
  });
}
