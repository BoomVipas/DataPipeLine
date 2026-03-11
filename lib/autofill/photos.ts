/**
 * Google Places Photos — triggered on first venue approval only.
 * Keeps cost minimal: only fires once per venue, only requests photo fields.
 */

const PLACES_API_BASE = 'https://places.googleapis.com/v1';
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

type SupabaseClient = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>;

export interface PlacePhoto {
  name: string;
}

function getExtensionFromContentType(contentType: string | null): string {
  if (!contentType) return 'jpg';

  const normalized = contentType.toLowerCase();
  if (normalized.includes('image/png')) return 'png';
  if (normalized.includes('image/webp')) return 'webp';
  if (normalized.includes('image/jpeg') || normalized.includes('image/jpg')) return 'jpg';
  return 'jpg';
}

export async function getPhotoUri(photoName: string): Promise<string | null> {
  if (!API_KEY) return null;

  const mediaUrl = `${PLACES_API_BASE}/${photoName}/media?maxHeightPx=1200&maxWidthPx=1200&key=${API_KEY}&skipHttpRedirect=true`;
  const mediaRes = await fetch(mediaUrl);
  if (!mediaRes.ok) return null;

  const payload = await mediaRes.json() as { photoUri?: string };
  return payload.photoUri ?? null;
}

async function readPhotoBuffer(photoUri: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const imageRes = await fetch(photoUri);
  if (!imageRes.ok) return null;

  const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg';
  const buffer = Buffer.from(await imageRes.arrayBuffer());

  return { buffer, contentType };
}

/**
 * Upload Google Places photos to Supabase Storage and return their public URLs.
 * URLs are stored directly in venues.photo_urls — no separate table needed.
 */
export async function ensurePhotosStored(
  photos: PlacePhoto[],
  venueId: string,
  supabase: SupabaseClient,
  maxPhotos = 5,
): Promise<string[]> {
  if (!API_KEY || !venueId) return [];

  const urls: string[] = [];

  for (const photo of photos.slice(0, maxPhotos)) {
    if (!photo?.name) continue;

    try {
      const photoUri = await getPhotoUri(photo.name);
      if (!photoUri) continue;

      const image = await readPhotoBuffer(photoUri);
      if (!image) continue;

      const ext = getExtensionFromContentType(image.contentType);
      const fileName = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('venue-photos')
        .upload(fileName, image.buffer, { contentType: image.contentType, upsert: false });

      if (uploadError) continue;

      const { data: publicUrlData } = supabase.storage
        .from('venue-photos')
        .getPublicUrl(fileName);

      console.log('[photos] stored:', publicUrlData.publicUrl);
      urls.push(publicUrlData.publicUrl);
    } catch {
      // Skip individual photo failures silently.
    }
  }

  return urls;
}

/** Search by name and return place ID + photo references (1 API call) */
async function findPlacePhotos(
  name: string,
  lat?: number | null,
  lng?: number | null,
): Promise<{ placeId: string; photos: PlacePhoto[] } | null> {
  if (!API_KEY) return null;

  const locationBias = (lat && lng)
    ? { circle: { center: { latitude: lat, longitude: lng }, radius: 500 } }
    : { circle: { center: { latitude: 13.7563, longitude: 100.5018 }, radius: 50000 } };

  const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.photos',
    },
    body: JSON.stringify({ textQuery: `${name} Bangkok`, locationBias }),
  });

  if (!res.ok) return null;
  const data = await res.json() as { places?: Array<{ id?: string; photos?: PlacePhoto[] }> };
  const place = data.places?.[0];
  if (!place?.id) return null;

  return {
    placeId: place.id,
    photos: (place.photos ?? []).filter((photo): photo is PlacePhoto => Boolean(photo?.name)),
  };
}

/** Get photo references by known place ID (1 API call, cheaper than search) */
async function getPhotosByPlaceId(placeId: string): Promise<PlacePhoto[]> {
  if (!API_KEY) return [];

  const res = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'photos',
    },
  });

  if (!res.ok) return [];

  const data = await res.json() as { photos?: PlacePhoto[] };
  return (data.photos ?? []).filter((photo): photo is PlacePhoto => Boolean(photo?.name));
}

/**
 * Fetch up to `maxPhotos` venue photos from Google Places and store in Supabase Storage.
 * Called on first approval — non-blocking, errors are swallowed by caller.
 *
 * Cost: 1–2 Places API calls (search if no place ID, or direct lookup if we have it).
 */
export async function fetchApprovalPhotos(
  venueId: string,
  venueName: string,
  supabase: SupabaseClient,
  options?: {
    lat?: number | null;
    lng?: number | null;
    existingPlaceId?: string | null;
    maxPhotos?: number;
  },
): Promise<{ photoUrls: string[]; placeId: string | null }> {
  if (!API_KEY) return { photoUrls: [], placeId: null };

  const { lat, lng, existingPlaceId, maxPhotos = 5 } = options ?? {};

  let placeId: string | null = existingPlaceId ?? null;
  let photos: PlacePhoto[] = [];

  if (placeId) {
    // Already have place ID — skip search, just fetch photos
    photos = await getPhotosByPlaceId(placeId);
  } else {
    const result = await findPlacePhotos(venueName, lat, lng);
    if (result) {
      placeId = result.placeId;
      photos = result.photos;
    }
  }

  if (!photos.length) return { photoUrls: [], placeId };

  const photoUrls = await ensurePhotosStored(photos, venueId, supabase, maxPhotos);
  return { photoUrls, placeId };
}
