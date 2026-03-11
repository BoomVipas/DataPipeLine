/**
 * Tests for lib/autofill/gemini.ts
 *
 * The module calls the Gemini API via `fetch`. We mock global.fetch to control
 * what the AI "returns" so we can test all the parsing and validation logic
 * without real network calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper: build a minimal Gemini API response wrapper around a text payload.
function geminiResponse(text: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  };
}

// Helper: simulate a Gemini API HTTP error.
function geminiError(status = 500) {
  return { ok: false, status };
}

// A valid, fully-populated venue JSON that Gemini might return.
const validVenueJson = JSON.stringify({
  name: 'Flow Space Yoga',
  address: '123 Sukhumvit Soi 11, Bangkok',
  lat: 13.7432,
  lng: 100.5605,
  district: 'Watthana',
  phone: '+66812345678',
  website_url: 'https://flowspace.co.th',
  instagram_url: 'https://instagram.com/flowspaceyoga',
  facebook_url: 'https://facebook.com/flowspaceyoga',
  line_id: '@flowspace',
  booking_url: 'https://flowspace.co.th/book',
  booking_method: 'online',
  opening_hours: {
    monday: [{ open: '07:00', close: '21:00' }],
    tuesday: [{ open: '07:00', close: '21:00' }],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  },
  price_level: 2,
  rating: 4.7,
  rating_count: 312,
  features: ['All Levels Welcome', 'Air Conditioned'],
  facilities: ['Parking', 'Showers'],
  short_description: 'A serene yoga studio in the heart of Bangkok.',
  long_description: 'Flow Space Yoga offers classes for all levels...',
  suggested_category: 'wellness',
  suggested_sub_category: 'mindful',
});

describe('searchVenueWithGemini', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
  });

  it('returns a parsed venue object from a clean JSON response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(validVenueJson) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Flow Space Yoga');
    expect(result!.lat).toBe(13.7432);
    expect(result!.lng).toBe(100.5605);
    expect(result!.phone).toBe('+66812345678');
    expect(result!.price_level).toBe(2);
    expect(result!.features).toEqual(['All Levels Welcome', 'Air Conditioned']);
    expect(result!.suggested_category_slug).toBe('wellness');
    expect(result!.suggested_sub_category).toBe('mindful');
  });

  it('strips markdown code fences and still parses the JSON', async () => {
    const wrapped = `\`\`\`json\n${validVenueJson}\n\`\`\``;
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(wrapped) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Flow Space Yoga');
  });

  it('falls back to extracting the first JSON object from surrounding text', async () => {
    const textWithJunk = `Here is the venue info:\n${validVenueJson}\nHope that helps!`;
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(textWithJunk) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Flow Space Yoga');
  });

  it('returns null when Gemini returns completely unparseable text', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse('Sorry, I could not find that venue.') as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Unknown Place', 'name');

    expect(result).toBeNull();
  });

  it('throws when the Gemini API returns an HTTP error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(geminiError(503) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    await expect(searchVenueWithGemini('Some Venue', 'name')).rejects.toThrow('Gemini API error: 503');
  });

  it('skips thought parts and uses the real response part', async () => {
    // Gemini 2.5 Flash thinking mode emits thought parts before the real answer
    const responseWithThought = {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [
              { text: 'Let me think about this venue...', thought: true },
              { text: validVenueJson },
            ],
          },
        }],
      }),
    };
    vi.mocked(fetch).mockResolvedValueOnce(responseWithThought as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result!.name).toBe('Flow Space Yoga');
  });

  // --- Field validation ---

  it('drops price_level values outside the 1-4 range', async () => {
    const bad = JSON.stringify({ ...JSON.parse(validVenueJson), price_level: 5 });
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(bad) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result!.price_level).toBeUndefined();
  });

  it('drops price_level 0 (below minimum)', async () => {
    const bad = JSON.stringify({ ...JSON.parse(validVenueJson), price_level: 0 });
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(bad) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result!.price_level).toBeUndefined();
  });

  it('drops an invalid suggested_category value', async () => {
    const bad = JSON.stringify({ ...JSON.parse(validVenueJson), suggested_category: 'sport' });
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(bad) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result!.suggested_category_slug).toBeUndefined();
  });

  it('accepts all valid suggested_category values', async () => {
    for (const cat of ['fitness', 'wellness', 'casual', 'nightlife']) {
      const json = JSON.stringify({ ...JSON.parse(validVenueJson), suggested_category: cat });
      vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(json) as never);

      vi.resetModules();
      const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
      const result = await searchVenueWithGemini('Venue', 'name');
      expect(result!.suggested_category_slug).toBe(cat);
    }
  });

  it('normalizes suggested_sub_category aliases (e.g. "Yoga" -> "mindful")', async () => {
    const withAlias = JSON.stringify({
      ...JSON.parse(validVenueJson),
      suggested_category: 'wellness',
      suggested_sub_category: 'Yoga',
    });
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(withAlias) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result!.suggested_sub_category).toBe('mindful');
  });

  it('drops suggested_sub_category when it does not match suggested_category', async () => {
    const mismatched = JSON.stringify({
      ...JSON.parse(validVenueJson),
      suggested_category: 'wellness',
      suggested_sub_category: 'club',
    });
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(mismatched) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result!.suggested_sub_category).toBeUndefined();
  });

  it('drops invalid suggested_sub_category values', async () => {
    const invalid = JSON.stringify({
      ...JSON.parse(validVenueJson),
      suggested_sub_category: 'unknown_type',
    });
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(invalid) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result!.suggested_sub_category).toBeUndefined();
  });

  it('drops an invalid booking_method value', async () => {
    const bad = JSON.stringify({ ...JSON.parse(validVenueJson), booking_method: 'email' });
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(bad) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result!.booking_method).toBeUndefined();
  });

  it('drops features array when it contains non-strings', async () => {
    const bad = JSON.stringify({ ...JSON.parse(validVenueJson), features: ['WiFi', 42, true] });
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(bad) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result!.features).toBeUndefined();
  });

  it('rounds rating_count to an integer', async () => {
    const withFloat = JSON.stringify({ ...JSON.parse(validVenueJson), rating_count: 99.7 });
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(withFloat) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result!.rating_count).toBe(100);
  });

  it('does not include opening_hours when Gemini returns an array (invalid shape)', async () => {
    const bad = JSON.stringify({ ...JSON.parse(validVenueJson), opening_hours: ['mon', 'tue'] });
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(bad) as never);

    const { searchVenueWithGemini } = await import('@/lib/autofill/gemini');
    const result = await searchVenueWithGemini('Flow Space Yoga', 'name');

    expect(result!.opening_hours).toBeUndefined();
  });
});
