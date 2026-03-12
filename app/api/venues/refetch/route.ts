import { NextRequest, NextResponse } from 'next/server';
import { searchByName } from '@/lib/autofill/google';
import { fetchApprovalPhotos } from '@/lib/autofill/photos';
import { createClient } from '@/lib/supabase/server';
import type { DayHours, OperatingHours, VenueStatus, VenueSubCategory } from '@/types/venue';

const DAY_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const VALID_SUB_CATEGORIES: VenueSubCategory[] = [
  'indoor',
  'outdoor',
  'mindful',
  'recovery',
  'games',
  'chill',
  'bar',
  'club',
];

interface RefetchRequestBody {
  category_id?: string;
  sub_category?: string;
  status?: string;
  venue_ids?: string[];
  dry_run?: boolean;
}

interface RefetchVenue {
  id: string;
  name: string;
  status: VenueStatus;
  google_place_id: string | null;
  category_id: string | null;
  sub_category: VenueSubCategory | null;
  lat: number | null;
  lng: number | null;
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function convertOpeningHours(periods: Array<{
  open: { day: number; hour: number; minute: number };
  close: { day: number; hour: number; minute: number };
}>): OperatingHours {
  const hours: OperatingHours = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };

  for (const period of periods) {
    const day = DAY_MAP[period.open.day];
    if (!day) continue;

    const slot: DayHours = {
      open: formatTime(period.open.hour, period.open.minute),
      close: formatTime(period.close.hour, period.close.minute),
    };

    hours[day].push(slot);
  }

  return hours;
}

function mapPriceLevel(level: string | undefined): 1 | 2 | 3 | 4 | undefined {
  const map: Record<string, 1 | 2 | 3 | 4> = {
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };

  return level ? map[level] : undefined;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: RefetchRequestBody = {};
  try {
    body = (await req.json()) as RefetchRequestBody;
  } catch {
    body = {};
  }

  const categoryId = typeof body.category_id === 'string' && body.category_id.trim()
    ? body.category_id.trim()
    : null;
  const subCategory = typeof body.sub_category === 'string' && VALID_SUB_CATEGORIES.includes(body.sub_category as VenueSubCategory)
    ? body.sub_category as VenueSubCategory
    : null;
  const status = typeof body.status === 'string' && body.status.trim() && body.status !== 'all'
    ? body.status.trim()
    : null;
  const venueIds = Array.isArray(body.venue_ids)
    ? body.venue_ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];
  const dryRun = Boolean(body.dry_run);

  let query = supabase
    .from('venues')
    .select('id, name, status, google_place_id, category_id, sub_category, lat, lng')
    .eq('is_deleted', false);

  if (categoryId) query = query.eq('category_id', categoryId);
  if (subCategory) query = query.eq('sub_category', subCategory);
  if (status) query = query.eq('status', status);
  if (venueIds.length > 0) query = query.in('id', venueIds);
  query = query.limit(50);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const venues = (data ?? []) as RefetchVenue[];

  if (dryRun) {
    return NextResponse.json({
      queued: venues.length,
      venues: venues.map(v => ({ id: v.id, name: v.name, status: v.status })),
    });
  }

  let updated = 0;
  let errors = 0;

  for (const venue of venues) {
    try {
      const [{ photoUrls, placeId }, place] = await Promise.all([
        fetchApprovalPhotos(venue.id, venue.name, supabase, {
          lat: venue.lat,
          lng: venue.lng,
          existingPlaceId: venue.google_place_id,
        }),
        searchByName(venue.name),
      ]);

      const update: Record<string, unknown> = {};

      if (photoUrls.length > 0) {
        update.photo_urls = photoUrls;
        update.hero_image_url = photoUrls[0];
      }

      if (placeId && !venue.google_place_id) {
        update.google_place_id = placeId;
      }

      if (place) {
        if (typeof place.rating === 'number') update.rating = place.rating;
        if (typeof place.userRatingCount === 'number') update.rating_count = place.userRatingCount;

        const mappedPriceLevel = mapPriceLevel(place.priceLevel);
        if (mappedPriceLevel) update.price_level = mappedPriceLevel;

        const periods = place.regularOpeningHours?.periods;
        if (periods && periods.length > 0) {
          update.opening_hours = convertOpeningHours(periods);
        }

        if (place.id && !venue.google_place_id && !update.google_place_id) {
          update.google_place_id = place.id;
        }
      }

      if (Object.keys(update).length > 0) {
        const { error: updateError } = await supabase
          .from('venues')
          .update(update)
          .eq('id', venue.id);

        if (updateError) {
          errors += 1;
          continue;
        }

        updated += 1;
      }
    } catch {
      errors += 1;
    }
  }

  return NextResponse.json({
    processed: venues.length,
    updated,
    errors,
  });
}
