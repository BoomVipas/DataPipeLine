import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const SUB_CATEGORY_KEY_MAP: Record<string, string> = {
  games: 'game',
  recovery: 'recover',
};

function buildPhotoArray(hero: string | null, photos: string[] | null): string[] | null {
  const all = [hero, ...(photos ?? [])].filter((u): u is string => !!u);
  const deduped = [...new Set(all)];
  return deduped.length > 0 ? deduped : null;
}

export async function POST() {
  const supabase = await createServiceClient();

  // Fetch all published venues that have an activity_id
  const { data: venues, error: fetchError } = await supabase
    .from('venues')
    .select('id, activity_id, sub_category, category_id, hero_image_url, photo_urls')
    .eq('status', 'published')
    .not('activity_id', 'is', null);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!venues || venues.length === 0) {
    return NextResponse.json({ message: 'No published venues found', updated: 0 });
  }

  // Load all categories once (avoid N+1 queries)
  const { data: categories, error: catError } = await supabase
    .from('category')
    .select('id, key');

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 });
  }

  const categoryByKey = Object.fromEntries((categories ?? []).map(c => [c.key, c.id]));

  const results: { venueId: string; activityId: string; status: string }[] = [];

  for (const venue of venues) {
    const subKey = venue.sub_category
      ? (SUB_CATEGORY_KEY_MAP[venue.sub_category] ?? venue.sub_category)
      : null;

    const categoryId = subKey
      ? (categoryByKey[subKey] ?? venue.category_id)
      : venue.category_id;

    const photoUrls = buildPhotoArray(venue.hero_image_url, venue.photo_urls);

    const { error: updateError } = await supabase
      .from('activity')
      .update({ category_id: categoryId, photo_urls: photoUrls })
      .eq('id', venue.activity_id);

    results.push({
      venueId: venue.id,
      activityId: venue.activity_id,
      status: updateError ? `error: ${updateError.message}` : 'ok',
    });
  }

  const failed = results.filter(r => r.status !== 'ok');
  const updated = results.filter(r => r.status === 'ok').length;

  return NextResponse.json({
    total: venues.length,
    updated,
    failed: failed.length,
    ...(failed.length > 0 ? { errors: failed } : {}),
  });
}
