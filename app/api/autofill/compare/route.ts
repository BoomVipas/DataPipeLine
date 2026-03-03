import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchVenueWithGemini } from '@/lib/autofill/gemini';
import { rateLimit } from '@/lib/rate-limit';
import type { AutofillVenueData } from '@/types/autofill';
import type { OperatingHours } from '@/types/venue';

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY!;

// ── Google Places helpers ─────────────────────────────────────────────────────

interface PlaceResult {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  geometry?: { location: { lat: number; lng: number } };
  opening_hours?: {
    periods?: {
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }[];
  };
}

async function googleTextSearch(query: string): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' Bangkok')}&key=${PLACES_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results?.[0]?.place_id ?? null;
}

async function googlePlaceDetails(placeId: string): Promise<PlaceResult | null> {
  const fields = 'place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,geometry,opening_hours';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${PLACES_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result ?? null;
}

function parseGoogleHours(place: PlaceResult): OperatingHours | null {
  const periods = place.opening_hours?.periods;
  if (!periods) return null;

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const result: OperatingHours = {
    monday: [], tuesday: [], wednesday: [], thursday: [],
    friday: [], saturday: [], sunday: [],
  };

  for (const p of periods) {
    const day = days[p.open.day];
    if (!day) continue;
    const openH = p.open.time.slice(0, 2) + ':' + p.open.time.slice(2);
    const closeH = p.close ? p.close.time.slice(0, 2) + ':' + p.close.time.slice(2) : '23:59';
    result[day].push({ open: openH, close: closeH });
  }

  return result;
}

function googleToAutofill(place: PlaceResult): Partial<AutofillVenueData> {
  const result: Partial<AutofillVenueData> = {};

  if (place.place_id) result.google_place_id = place.place_id;
  if (place.name) result.name = place.name;
  if (place.formatted_address) result.address = place.formatted_address;
  if (place.formatted_phone_number) result.phone = place.formatted_phone_number;
  if (place.website) result.website_url = place.website;
  if (typeof place.rating === 'number') result.rating = place.rating;
  if (typeof place.user_ratings_total === 'number') result.rating_count = place.user_ratings_total;
  if (typeof place.price_level === 'number' && place.price_level >= 1 && place.price_level <= 4) {
    result.price_level = place.price_level as 1 | 2 | 3 | 4;
  }
  if (place.geometry?.location) {
    result.lat = place.geometry.location.lat;
    result.lng = place.geometry.location.lng;
  }
  const hours = parseGoogleHours(place);
  if (hours) result.opening_hours = hours;

  return result;
}

function ts() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const log: string[] = [];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  if (!rateLimit(user.id, 15, 60_000)) {
    return NextResponse.json({ success: false, error: 'Too many requests.' }, { status: 429 });
  }

  const { data: adminUser } = await supabase
    .from('admin_users').select('id').eq('user_id', user.id).single();
  if (!adminUser) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const input: string = body.input?.trim() ?? '';
  if (!input) return NextResponse.json({ success: false, error: 'Input is required' }, { status: 400 });

  log.push(`[${ts()}] Starting parallel fetch for: "${input}"`);
  log.push(`[${ts()}] → [Thread 1] Gemini 2.0 Flash with Google Search grounding`);
  log.push(`[${ts()}] → [Thread 2] Google Places API — text search + place details`);

  // Run Gemini and Google Places in parallel
  const [geminiResult, googleResult] = await Promise.allSettled([
    searchVenueWithGemini(input, 'name'),
    (async () => {
      if (!PLACES_KEY) {
        log.push(`[${ts()}] ✗ [Thread 2] GOOGLE_PLACES_API_KEY not set — skipping`);
        return null;
      }
      const placeId = await googleTextSearch(input);
      if (!placeId) {
        log.push(`[${ts()}] ✗ [Thread 2] Google Places: venue not found`);
        return null;
      }
      log.push(`[${ts()}] ✓ [Thread 2] Google Places: found place_id ${placeId.slice(0, 20)}...`);
      const place = await googlePlaceDetails(placeId);
      if (!place) return null;
      return googleToAutofill(place);
    })(),
  ]);

  const gemini = geminiResult.status === 'fulfilled' ? geminiResult.value : null;
  const google = googleResult.status === 'fulfilled' ? googleResult.value : null;

  if (gemini) {
    log.push(`[${ts()}] ✓ [Thread 1] Gemini returned ${Object.keys(gemini).length} fields`);
  } else {
    log.push(`[${ts()}] ✗ [Thread 1] Gemini failed: ${geminiResult.status === 'rejected' ? geminiResult.reason : 'no data'}`);
  }

  if (google) {
    log.push(`[${ts()}] ✓ [Thread 2] Google Maps returned ${Object.keys(google).length} fields`);
  }

  if (!gemini && !google) {
    log.push(`[${ts()}] ✗ Both sources failed — aborting`);
    return NextResponse.json({ success: false, error: 'No data found for this venue.', process_log: log }, { status: 404 });
  }

  // Count matching vs differing fields
  const allKeys = new Set([...Object.keys(gemini ?? {}), ...Object.keys(google ?? {})]);
  let matches = 0, diffs = 0;
  for (const k of allKeys) {
    const g = (gemini as Record<string, unknown> | null)?.[k];
    const m = (google as Record<string, unknown> | null)?.[k];
    if (g != null && m != null) {
      JSON.stringify(g) === JSON.stringify(m) ? matches++ : diffs++;
    }
  }
  log.push(`[${ts()}] ✓ Comparison ready — ${matches} matching fields, ${diffs} fields differ`);

  return NextResponse.json({
    success: true,
    gemini: gemini ?? {},
    google: google ?? {},
    process_log: log,
  });
}
