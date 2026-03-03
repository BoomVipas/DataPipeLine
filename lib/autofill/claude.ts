// Description generation via Gemini — no Anthropic SDK needed

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY!;
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const CATEGORY_LABELS: Record<string, string> = {
  fitness: 'Fitness',
  wellness: 'Wellness',
  casual: 'Casual',
  nightlife: 'Night Life',
};

const PRICE_SYMBOLS: Record<number, string> = {
  1: '฿ (budget-friendly)',
  2: '฿฿ (mid-range)',
  3: '฿฿฿ (upscale)',
  4: '฿฿฿฿ (luxury)',
};

interface DescriptionInput {
  name: string;
  category?: string;
  district?: string;
  address?: string;
  priceRange?: number | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  websiteDescription?: string;
}

export async function generateDescription(input: DescriptionInput): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  const {
    name, category, district, address,
    priceRange, googleRating, googleReviewCount, websiteDescription,
  } = input;

  const context = [
    `Venue name: ${name}`,
    category ? `Category: ${CATEGORY_LABELS[category] ?? category}` : null,
    district ? `Bangkok district: ${district}` : null,
    address ? `Address: ${address}` : null,
    priceRange ? `Price range: ${PRICE_SYMBOLS[priceRange]}` : null,
    googleRating ? `Google rating: ${googleRating}/5 (${googleReviewCount?.toLocaleString() ?? '?'} reviews)` : null,
    websiteDescription ? `From the website: "${websiteDescription.slice(0, 300)}"` : null,
  ].filter(Boolean).join('\n');

  const prompt = `You are writing venue descriptions for the Wander app — a Bangkok lifestyle discovery platform for explorers who value thoughtfully curated, authentic experiences.

Write a 2–3 sentence venue description for this place. Be specific, warm, and vivid. Avoid generic phrases like "great ambiance", "must-visit", or "cozy atmosphere". Don't mention ratings, prices, or locations directly — focus on the experience.

${context}

Description (2–3 sentences only, no quotes, no preamble):`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      candidates?: { content: { parts: { text: string }[] } }[];
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}
