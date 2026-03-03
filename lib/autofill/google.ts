import type { OperatingHours, DayHours } from '@/types/venue';
import type { AutofillVenueData } from '@/types/autofill';

const PLACES_API_BASE = 'https://places.googleapis.com/v1';
const API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

interface PlacesSearchResult {
  places?: PlaceResult[];
}

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  regularOpeningHours?: { periods: OpeningPeriod[] };
  photos?: PlacePhoto[];
  types?: string[];
  addressComponents?: AddressComponent[];
}

interface OpeningPeriod {
  open: { day: number; hour: number; minute: number };
  close: { day: number; hour: number; minute: number };
}

interface PlacePhoto {
  name: string;
}

interface AddressComponent {
  longText: string;
  types: string[];
}

const DAY_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function convertOpeningHours(periods: OpeningPeriod[]): OperatingHours {
  const hours: OperatingHours = {
    monday: [], tuesday: [], wednesday: [], thursday: [],
    friday: [], saturday: [], sunday: [],
  };

  for (const period of periods) {
    const dayName = DAY_MAP[period.open.day];
    const slot: DayHours = {
      open: formatTime(period.open.hour, period.open.minute),
      close: formatTime(period.close.hour, period.close.minute),
    };
    hours[dayName].push(slot);
  }

  return hours;
}

function extractDistrict(components: AddressComponent[]): string | undefined {
  // Try administrative_area_level_2 or sublocality
  const district = components.find(c =>
    c.types.includes('administrative_area_level_2') ||
    c.types.includes('sublocality') ||
    c.types.includes('sublocality_level_1')
  );
  return district?.longText;
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

async function getPhotoUrl(photoName: string): Promise<string> {
  const url = `${PLACES_API_BASE}/${photoName}/media?maxHeightPx=1200&maxWidthPx=1200&key=${API_KEY}&skipHttpRedirect=true`;
  const res = await fetch(url);
  const data = await res.json();
  return data.photoUri ?? '';
}

export async function searchByName(name: string): Promise<PlaceResult | null> {
  const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.nationalPhoneNumber',
        'places.internationalPhoneNumber',
        'places.websiteUri',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.regularOpeningHours',
        'places.photos',
        'places.types',
        'places.addressComponents',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: name,
      locationBias: {
        circle: {
          center: { latitude: 13.7563, longitude: 100.5018 }, // Bangkok center
          radius: 50000.0,
        },
      },
    }),
  });

  if (!res.ok) return null;
  const data: PlacesSearchResult = await res.json();
  return data.places?.[0] ?? null;
}

export async function getPlaceById(placeId: string): Promise<PlaceResult | null> {
  const fieldMask = [
    'id', 'displayName', 'formattedAddress', 'location',
    'nationalPhoneNumber', 'internationalPhoneNumber', 'websiteUri',
    'rating', 'userRatingCount', 'priceLevel',
    'regularOpeningHours', 'photos', 'types', 'addressComponents',
  ].join(',');

  const res = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': fieldMask,
    },
  });

  if (!res.ok) return null;
  return res.json();
}

export function extractPlaceIdFromUrl(url: string): string | null {
  // Extract from google maps URL patterns
  const cid = url.match(/[?&]cid=(\d+)/)?.[1];
  if (cid) return cid;

  const place = url.match(/place\/[^/]+\/([^/?\s]+)/)?.[1];
  if (place?.startsWith('ChIJ')) return place;

  return null;
}

/** Fetch up to maxPhotos Google Places photos and return Supabase Storage URLs */
export async function downloadPhotosToStorage(
  photos: PlacePhoto[],
  placeId: string,
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never,
  maxPhotos = 5
): Promise<string[]> {
  const urls: string[] = [];
  const toProcess = photos.slice(0, maxPhotos);

  for (let i = 0; i < toProcess.length; i++) {
    try {
      const photoUrl = await getPhotoUrl(toProcess[i].name);
      if (!photoUrl) continue;

      const response = await fetch(photoUrl);
      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') ?? 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      const buffer = Buffer.from(await response.arrayBuffer());
      const path = `${placeId}/${i}.${ext}`;

      const { error } = await supabase.storage
        .from('venue-photos')
        .upload(path, buffer, { contentType, upsert: true });

      if (error) continue;

      const { data: { publicUrl } } = supabase.storage
        .from('venue-photos')
        .getPublicUrl(path);

      urls.push(publicUrl);
    } catch {
      // Skip failed photos
    }
  }

  return urls;
}

export async function placeToAutofillData(
  place: PlaceResult,
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never
): Promise<Partial<AutofillVenueData>> {
  const photoUrls = place.photos
    ? await downloadPhotosToStorage(place.photos, place.id, supabase)
    : [];

  return {
    name: place.displayName?.text,
    address: place.formattedAddress,
    lat: place.location?.latitude,
    lng: place.location?.longitude,
    district: place.addressComponents ? extractDistrict(place.addressComponents) : undefined,
    google_place_id: place.id,
    phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber,
    website_url: place.websiteUri,
    opening_hours: place.regularOpeningHours
      ? convertOpeningHours(place.regularOpeningHours.periods)
      : undefined,
    price_level: mapPriceLevel(place.priceLevel),
    rating: place.rating,
    rating_count: place.userRatingCount,
    photo_urls: photoUrls,
    hero_image_url: photoUrls[0],
  };
}
