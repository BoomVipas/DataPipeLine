import type { AutofillVenueData } from '@/types/autofill';

/**
 * Merges multiple partial AutofillVenueData objects.
 * Priority: first source wins for each field (except photos which are combined).
 * Pass sources in priority order: Google Places first, then Website.
 */
export function mergeVenueData(sources: Partial<AutofillVenueData>[]): Partial<AutofillVenueData> {
  const merged: Partial<AutofillVenueData> = {};

  // Collect all photo URLs from all sources
  const allPhotos: string[] = [];

  for (const source of sources) {
    // Merge photo_urls (combine, don't overwrite)
    if (source.photo_urls?.length) {
      allPhotos.push(...source.photo_urls);
    }

    // For every other field, first non-null wins
    for (const key of Object.keys(source) as (keyof AutofillVenueData)[]) {
      if (key === 'photo_urls' || key === 'hero_image_url' || key === 'sources_used') continue;

      const value = source[key];
      if (value !== undefined && value !== null && value !== '' && merged[key] === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (merged as any)[key] = value;
      }
    }
  }

  // Deduplicate photos by URL
  const seen = new Set<string>();
  const deduped = allPhotos.filter(url => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  if (deduped.length > 0) {
    merged.photo_urls = deduped;
    if (!merged.hero_image_url) {
      merged.hero_image_url = deduped[0];
    }
  }

  return merged;
}
