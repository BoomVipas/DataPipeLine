import type { AutofillVenueData } from '@/types/autofill';

interface ScrapedData {
  name?: string;
  description?: string;
  image?: string;
  phone?: string;
  address?: string;
  url?: string;
}

function parseJsonLd(html: string): ScrapedData {
  const results: ScrapedData = {};
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const data = Array.isArray(json) ? json[0] : json;

      if (!results.name && data.name) results.name = String(data.name);
      if (!results.description && data.description) results.description = String(data.description).slice(0, 500);
      if (!results.phone && data.telephone) results.phone = String(data.telephone);
      if (!results.address && data.address?.streetAddress) {
        results.address = [
          data.address.streetAddress,
          data.address.addressLocality,
          data.address.addressCountry,
        ].filter(Boolean).join(', ');
      }
      if (!results.image) {
        const img = data.image;
        if (typeof img === 'string') results.image = img;
        else if (Array.isArray(img) && img[0]) results.image = typeof img[0] === 'string' ? img[0] : img[0]?.url;
        else if (img?.url) results.image = img.url;
      }
    } catch {
      // skip malformed JSON-LD
    }
  }

  return results;
}

function parseOpenGraph(html: string): ScrapedData {
  const results: ScrapedData = {};

  function getMeta(property: string): string | undefined {
    const match = html.match(new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      'i'
    )) ?? html.match(new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      'i'
    ));
    return match?.[1];
  }

  results.name = getMeta('og:title') ?? getMeta('twitter:title');
  results.description = getMeta('og:description') ?? getMeta('twitter:description') ?? getMeta('description');
  results.image = getMeta('og:image') ?? getMeta('twitter:image');
  results.url = getMeta('og:url');

  if (results.description) results.description = results.description.slice(0, 500);

  return results;
}

function getTitleFallback(html: string): string | undefined {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
}

export async function scrapeWebsite(url: string): Promise<Partial<AutofillVenueData>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WanderBot/1.0)',
        'Accept': 'text/html',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return {};

    const html = await res.text();

    // Priority: JSON-LD > Open Graph > title
    const jsonLd = parseJsonLd(html);
    const og = parseOpenGraph(html);
    const titleFallback = getTitleFallback(html);

    const name = jsonLd.name || og.name || titleFallback;
    const description = jsonLd.description || og.description;
    const image = jsonLd.image || og.image;
    const phone = jsonLd.phone;
    const address = jsonLd.address;

    return {
      name: name,
      short_description: description,
      hero_image_url: image,
      phone: phone,
      address: address,
      website_url: url,
    };
  } catch {
    clearTimeout(timeout);
    return {};
  }
}
