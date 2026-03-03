import type { AutofillVenueData } from '@/types/autofill';
import type { OperatingHours } from '@/types/venue';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY!;
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface GeminiApiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiApiResponse {
  candidates?: { content: { parts: GeminiApiPart[] } }[];
}

async function callGeminiWithSearch(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      // Disable thinking — we want fast structured JSON, not reasoning tokens
      generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data: GeminiApiResponse = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  // Skip thought parts (Gemini 2.5-flash thinking mode) — use the first real response part
  const responsePart = parts.find(p => !p.thought && p.text) ?? parts[parts.length - 1];
  return responsePart?.text ?? '';
}

function extractJson(text: string): Record<string, unknown> | null {
  // Strip markdown code fences
  const stripped = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Fallback: extract first JSON object from text
    const match = text.match(/\{[\s\S]+\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch { /* ignore */ }
    }
    return null;
  }
}

function buildPrompt(query: string): string {
  return `Search for this Bangkok venue: ${query}

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "name": "venue name in English",
  "address": "full street address in English",
  "lat": <decimal number>,
  "lng": <decimal number>,
  "district": "Bangkok district name",
  "phone": "+66...",
  "website_url": "https://...",
  "opening_hours": {
    "monday":    [{"open": "HH:MM", "close": "HH:MM"}],
    "tuesday":   [{"open": "HH:MM", "close": "HH:MM"}],
    "wednesday": [{"open": "HH:MM", "close": "HH:MM"}],
    "thursday":  [{"open": "HH:MM", "close": "HH:MM"}],
    "friday":    [{"open": "HH:MM", "close": "HH:MM"}],
    "saturday":  [{"open": "HH:MM", "close": "HH:MM"}],
    "sunday":    []
  },
  "price_level": <1|2|3|4>,
  "rating": <Google rating 1-5>,
  "rating_count": <integer>,
  "short_description": "2-3 sentence description of the venue",
  "suggested_category": "fitness|wellness|casual|nightlife"
}

Rules:
- Use [] for days the venue is closed
- Use null for any field you cannot find with confidence
- Times must be 24-hour HH:MM format
- price_level: 1=budget, 2=moderate, 3=expensive, 4=luxury
- suggested_category: fitness (gym/yoga/sport), wellness (spa/meditation/recovery), casual (cafe/restaurant/entertainment), nightlife (bar/club)
- For split hours (e.g. lunch break), add a second slot to that day's array`;
}

/**
 * Search for a Bangkok venue using Gemini 2.0 Flash with Google Search grounding.
 * Returns structured AutofillVenueData or null if not found.
 */
export async function searchVenueWithGemini(
  input: string,
  inputType: 'name' | 'google_maps' | 'website',
): Promise<Partial<AutofillVenueData> | null> {
  const query =
    inputType === 'google_maps'
      ? `venue at this Google Maps URL: ${input}`
      : inputType === 'website'
      ? `venue from this website: ${input}`
      : input;

  const text = await callGeminiWithSearch(buildPrompt(query));
  const data = extractJson(text);
  if (!data) return null;

  const result: Partial<AutofillVenueData> = {};

  if (typeof data.name === 'string') result.name = data.name;
  if (typeof data.address === 'string') result.address = data.address;
  if (typeof data.lat === 'number') result.lat = data.lat;
  if (typeof data.lng === 'number') result.lng = data.lng;
  if (typeof data.district === 'string') result.district = data.district;
  if (typeof data.phone === 'string') result.phone = data.phone;
  if (typeof data.website_url === 'string') result.website_url = data.website_url;
  if (
    typeof data.price_level === 'number' &&
    data.price_level >= 1 &&
    data.price_level <= 4
  ) {
    result.price_level = data.price_level as 1 | 2 | 3 | 4;
  }
  if (typeof data.rating === 'number') result.rating = data.rating;
  if (typeof data.rating_count === 'number') result.rating_count = Math.round(data.rating_count);
  if (typeof data.short_description === 'string') result.short_description = data.short_description;
  if (
    typeof data.suggested_category === 'string' &&
    ['fitness', 'wellness', 'casual', 'nightlife'].includes(data.suggested_category)
  ) {
    result.suggested_category_slug = data.suggested_category;
  }
  if (data.opening_hours && typeof data.opening_hours === 'object' && !Array.isArray(data.opening_hours)) {
    result.opening_hours = data.opening_hours as OperatingHours;
  }

  return result;
}
