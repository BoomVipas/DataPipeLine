import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchVenueWithGemini } from '@/lib/autofill/gemini';
import { scrapeWebsite } from '@/lib/autofill/website';
import { generateDescription } from '@/lib/autofill/claude';
import { mergeVenueData } from '@/lib/autofill/merge';
import { searchByName } from '@/lib/autofill/google';
import { ensurePhotosStored, getPhotoUri } from '@/lib/autofill/photos';
import { rateLimit } from '@/lib/rate-limit';
import type { AutofillVenueData } from '@/types/autofill';

function detectInputType(input: string): 'name' | 'google_maps' | 'website' {
  if (/maps\.google|goo\.gl\/maps|google\.com\/maps/i.test(input)) return 'google_maps';
  if (/^https?:\/\//i.test(input)) return 'website';
  return 'name';
}

function ts() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: NextRequest) {
  const log: string[] = [];

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  // Rate limit: 15 autofill requests per minute per user (Gemini API cost control)
  if (!rateLimit(user.id, 120, 60_000)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please wait a moment.' },
      { status: 429 },
    );
  }

  const { data: adminUser } = await supabase
    .from('admin_users').select('id').eq('user_id', user.id).single();
  if (!adminUser) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const input: string = body.input?.trim() ?? '';
  const venueIdFromBody: string | null = typeof body.venue_id === 'string' && isUuid(body.venue_id.trim())
    ? body.venue_id.trim()
    : null;

  if (!input) {
    return NextResponse.json({ success: false, error: 'Input is required' }, { status: 400 });
  }

  const inputType = detectInputType(input);
  log.push(`[${ts()}] Input: "${input}" → detected as ${inputType}`);

  const sourcesUsed: string[] = [];
  const rawData: Record<string, unknown> = {};

  let geminiData: Partial<AutofillVenueData> | null = null;
  let websiteData: Partial<AutofillVenueData> | null = null;

  // --- Gemini Search ---
  if (inputType === 'name' || inputType === 'google_maps') {
    log.push(`[${ts()}] → Calling Gemini 2.5 Flash with Google Search grounding...`);
    try {
      geminiData = await searchVenueWithGemini(input, inputType);
      if (geminiData && Object.keys(geminiData).length > 0) {
        log.push(`[${ts()}] ✓ Gemini returned ${Object.keys(geminiData).length} fields (name, address, hours, etc.)`);
        rawData.gemini = { input, inputType };
        sourcesUsed.push('gemini');

        // Fetch and permanently store photos from Google Places
        if (!geminiData.hero_image_url && geminiData.name) {
          log.push(`[${ts()}] → Fetching photos from Google Places and saving to storage...`);
          try {
            const place = await searchByName(geminiData.name);
            if (place) {
              // Always override with Google Places authoritative fields
              if (place.id) geminiData.google_place_id = place.id;
              if (place.location?.latitude)  geminiData.lat = place.location.latitude;
              if (place.location?.longitude) geminiData.lng = place.location.longitude;
              if (typeof place.rating === 'number') geminiData.rating = place.rating;
              if (typeof place.userRatingCount === 'number') geminiData.rating_count = place.userRatingCount;
              const phone = place.internationalPhoneNumber ?? place.nationalPhoneNumber;
              if (phone) geminiData.phone = phone;
            }

            // Permanent storage now requires a real venues.id for FK in venue_photos.
            // New-venue prefill requests do not have that ID yet, so we only store when provided.
            if (place?.photos?.length && venueIdFromBody) {
              const photoUrls = await ensurePhotosStored(place.photos, venueIdFromBody, supabase, 5);
              if (photoUrls.length > 0) {
                geminiData.hero_image_url = photoUrls[0];
                geminiData.photo_urls = photoUrls;
                log.push(`[${ts()}] ✓ ${photoUrls.length} photo(s) saved to Supabase Storage`);
              } else {
                log.push(`[${ts()}] — Photos found but failed to save to storage`);
              }
            } else if (place?.photos?.length) {
              log.push(`[${ts()}] — Skipping permanent photo storage (venue_id unavailable during prefill)`);
              // Still fetch a temp signed URL for card preview in the batch tool
              try {
                const previewUrl = await getPhotoUri(place.photos[0].name);
                if (previewUrl) geminiData.preview_photo_url = previewUrl;
              } catch {
                // non-blocking
              }
            } else {
              log.push(`[${ts()}] — No photos found on Google Places`);
            }
          } catch {
            log.push(`[${ts()}] ✗ Google Places photo fetch failed (non-blocking)`);
          }
        }

        // If Gemini found a website, scrape it for extra info + hero image
        if (geminiData.website_url) {
          log.push(`[${ts()}] → Scraping venue website: ${geminiData.website_url}`);
          try {
            websiteData = await scrapeWebsite(geminiData.website_url);
            if (Object.keys(websiteData).length > 0) {
              log.push(`[${ts()}] ✓ Website scraped — ${Object.keys(websiteData).length} additional fields`);
              rawData.website = { url: geminiData.website_url };
              sourcesUsed.push('website');
            } else {
              log.push(`[${ts()}] — Website had no useful structured data`);
            }
          } catch {
            log.push(`[${ts()}] ✗ Website scrape failed (non-blocking)`);
          }
        }
      } else {
        log.push(`[${ts()}] ✗ Gemini could not find venue data`);
      }
    } catch (e) {
      log.push(`[${ts()}] ✗ Gemini request failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  }

  // --- Website scraper (for direct website URLs) ---
  if (inputType === 'website') {
    log.push(`[${ts()}] → Scraping URL directly: ${input}`);
    try {
      websiteData = await scrapeWebsite(input);
      if (Object.keys(websiteData).length > 0) {
        log.push(`[${ts()}] ✓ Website scraped — ${Object.keys(websiteData).length} fields`);
        rawData.website = { url: input };
        sourcesUsed.push('website');

        log.push(`[${ts()}] → Calling Gemini with website context for structured data...`);
        try {
          geminiData = await searchVenueWithGemini(input, 'website');
          if (geminiData && Object.keys(geminiData).length > 0) {
            log.push(`[${ts()}] ✓ Gemini returned ${Object.keys(geminiData).length} structured fields`);
            rawData.gemini = { input, inputType: 'website' };
            if (!sourcesUsed.includes('gemini')) sourcesUsed.push('gemini');
          }
        } catch {
          log.push(`[${ts()}] ✗ Gemini request failed (non-blocking)`);
        }
      }
    } catch {
      log.push(`[${ts()}] ✗ Website scrape failed`);
    }
  }

  // --- Merge ---
  log.push(`[${ts()}] → Merging data from sources: ${sourcesUsed.join(', ') || 'none'}`);
  const merged = mergeVenueData([
    geminiData ?? {},
    websiteData ?? {},
  ]);

  // --- AI Description ---
  let descriptionIsAi = !!geminiData?.short_description;

  if (geminiData?.short_description) {
    log.push(`[${ts()}] ✓ Description provided by Gemini (AI draft)`);
  } else if (!merged.short_description && merged.name) {
    log.push(`[${ts()}] → No description found — generating with Gemini...`);
    try {
      const aiDesc = await generateDescription({
        name: merged.name,
        category: merged.suggested_category_slug,
        district: merged.district,
        address: merged.address,
        priceRange: merged.price_level,
        googleRating: merged.rating,
        googleReviewCount: merged.rating_count,
        websiteDescription: websiteData?.short_description,
      });
      if (aiDesc) {
        merged.short_description = aiDesc;
        descriptionIsAi = true;
        log.push(`[${ts()}] ✓ AI description generated (${aiDesc.length} chars)`);
      }
    } catch {
      log.push(`[${ts()}] ✗ Description generation failed (non-blocking)`);
    }
  }

  if (sourcesUsed.length === 0) {
    log.push(`[${ts()}] ✗ No data found — aborting`);
    return NextResponse.json({
      success: false,
      error: 'Could not find any data for this venue. Try a different name or URL.',
      process_log: log,
    }, { status: 404 });
  }

  const fieldCount = Object.values(merged).filter(v => v != null).length;
  log.push(`[${ts()}] ✓ Done — ${fieldCount} fields ready, sources: [${sourcesUsed.join(', ')}]`);

  const venue: AutofillVenueData = {
    ...merged,
    sources_used: sourcesUsed,
    description_is_ai: descriptionIsAi,
  };

  return NextResponse.json({ success: true, venue, raw_data: rawData, process_log: log });
}
