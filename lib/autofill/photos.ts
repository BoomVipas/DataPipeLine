/**
 * Google Places Photos — triggered on first venue approval only.
 * Keeps cost minimal: only fires once per venue, only requests photo fields.
 */

const PLACES_API_BASE = 'https://places.googleapis.com/v1';
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface PlacePhoto {
  name: string;
}

/** Search by name and return place ID + photo references (1 API call) */
async function findPlacePhotos(
  name: string,
  lat?: number | null,
  lng?: number | null,
): Promise<{ placeId: string; photoNames: string[] } | null> {
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
  const data = await res.json();
  const place = data.places?.[0];
  if (!place) return null;

  return {
    placeId: place.id as string,
    photoNames: (place.photos as PlacePhoto[] ?? []).map(p => p.name),
  };
}

/** Get photo references by known place ID (1 API call, cheaper than search) */
async function getPhotosByPlaceId(placeId: string): Promise<string[]> {
  if (!API_KEY) return [];
  const res = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'photos',
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.photos as PlacePhoto[] ?? []).map(p => p.name);
}

/** Resolve a photo reference to a real URL, download, and upload to Supabase Storage */
async function downloadPhoto(
  photoName: string,
  storagePath: string,
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
): Promise<string | null> {
  if (!API_KEY) return null;

  // Get the actual image URL (skipHttpRedirect returns JSON with photoUri)
  const mediaUrl = `${PLACES_API_BASE}/${photoName}/media?maxHeightPx=1200&maxWidthPx=1200&key=${API_KEY}&skipHttpRedirect=true`;
  const mediaRes = await fetch(mediaUrl);
  if (!mediaRes.ok) return null;

  const { photoUri } = await mediaRes.json() as { photoUri?: string };
  if (!photoUri) return null;

  const imgRes = await fetch(photoUri);
  if (!imgRes.ok) return null;

  const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  const { error } = await supabase.storage
    .from('venue-photos')
    .upload(`${storagePath}.${ext}`, buffer, { contentType, upsert: true });
  if (error) return null;

  const { data: { publicUrl } } = supabase.storage
    .from('venue-photos')
    .getPublicUrl(`${storagePath}.${ext}`);
  return publicUrl;
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
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
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
  let photoNames: string[] = [];

  if (placeId) {
    // Already have place ID — skip search, just fetch photos
    photoNames = await getPhotosByPlaceId(placeId);
  } else {
    const result = await findPlacePhotos(venueName, lat, lng);
    if (result) {
      placeId = result.placeId;
      photoNames = result.photoNames;
    }
  }

  if (!photoNames.length) return { photoUrls: [], placeId };

  const photoUrls: string[] = [];
  for (let i = 0; i < Math.min(photoNames.length, maxPhotos); i++) {
    try {
      const url = await downloadPhoto(photoNames[i], `${venueId}/${i}`, supabase);
      if (url) photoUrls.push(url);
    } catch {
      // Skip individual photo failures silently
    }
  }

  return { photoUrls, placeId };
}
