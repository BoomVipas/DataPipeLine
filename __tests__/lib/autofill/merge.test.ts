import { describe, it, expect } from 'vitest';
import { mergeVenueData } from '@/lib/autofill/merge';

describe('mergeVenueData', () => {
  it('returns an empty object when given no sources', () => {
    expect(mergeVenueData([])).toEqual({});
  });

  it('returns data from a single source unchanged (except hero_image from photos)', () => {
    const result = mergeVenueData([{ name: 'Yoga Studio', phone: '+66123456789' }]);
    expect(result.name).toBe('Yoga Studio');
    expect(result.phone).toBe('+66123456789');
  });

  it('first non-null value wins for scalar fields', () => {
    const result = mergeVenueData([
      { name: 'First Name' },
      { name: 'Second Name' },
    ]);
    expect(result.name).toBe('First Name');
  });

  it('second source fills in fields that the first source left empty', () => {
    const result = mergeVenueData([
      { name: 'Yoga Studio' },
      { name: 'Other', phone: '+66111111111' },
    ]);
    expect(result.name).toBe('Yoga Studio');   // first wins
    expect(result.phone).toBe('+66111111111'); // filled by second
  });

  it('ignores null values and lets a later source win', () => {
    const result = mergeVenueData([
      { name: null as unknown as string },
      { name: 'Real Name' },
    ]);
    expect(result.name).toBe('Real Name');
  });

  it('ignores empty-string values and lets a later source win', () => {
    const result = mergeVenueData([
      { phone: '' },
      { phone: '+66222222222' },
    ]);
    expect(result.phone).toBe('+66222222222');
  });

  it('ignores undefined values and lets a later source win', () => {
    const result = mergeVenueData([
      { address: undefined },
      { address: '123 Main St' },
    ]);
    expect(result.address).toBe('123 Main St');
  });

  // --- photo merging ---

  it('combines photo_urls from all sources', () => {
    const result = mergeVenueData([
      { photo_urls: ['https://a.com/1.jpg', 'https://a.com/2.jpg'] },
      { photo_urls: ['https://b.com/3.jpg'] },
    ]);
    expect(result.photo_urls).toEqual([
      'https://a.com/1.jpg',
      'https://a.com/2.jpg',
      'https://b.com/3.jpg',
    ]);
  });

  it('deduplicates photo_urls across sources', () => {
    const result = mergeVenueData([
      { photo_urls: ['https://a.com/1.jpg'] },
      { photo_urls: ['https://a.com/1.jpg', 'https://b.com/2.jpg'] },
    ]);
    expect(result.photo_urls).toEqual(['https://a.com/1.jpg', 'https://b.com/2.jpg']);
  });

  it('sets hero_image_url to the first photo when no explicit hero is provided', () => {
    const result = mergeVenueData([
      { photo_urls: ['https://a.com/hero.jpg', 'https://a.com/other.jpg'] },
    ]);
    expect(result.hero_image_url).toBe('https://a.com/hero.jpg');
  });

  it('documents known gap: hero_image_url from a source is not propagated by the generic loop', () => {
    // NOTE: This test documents a potential bug. The merge loop explicitly skips
    // the 'hero_image_url' key, so a hero set directly on a source object is
    // never copied into the merged result. Instead, hero_image_url is derived
    // only from the deduplicated photo_urls at the end of the function.
    // Consequence: if source 1 has hero_image_url but no photo_urls, and
    // source 2 has photo_urls, source 2's first photo becomes the hero.
    const result = mergeVenueData([
      { hero_image_url: 'https://a.com/custom-hero.jpg' },
      { photo_urls: ['https://b.com/photo.jpg'] },
    ]);
    // The explicit hero_image_url is lost; the first deduped photo wins instead.
    expect(result.hero_image_url).toBe('https://b.com/photo.jpg');
  });

  it('handles sources with no photos gracefully', () => {
    const result = mergeVenueData([
      { name: 'Gym' },
      { address: '1 Sukhumvit' },
    ]);
    expect(result.photo_urls).toBeUndefined();
    expect(result.hero_image_url).toBeUndefined();
  });

  // --- nested objects ---

  it('first source wins for nested objects like opening_hours', () => {
    const hours1 = { monday: [{ open: '09:00', close: '18:00' }] };
    const hours2 = { monday: [{ open: '10:00', close: '20:00' }] };
    const result = mergeVenueData([
      { opening_hours: hours1 as never },
      { opening_hours: hours2 as never },
    ]);
    expect(result.opening_hours).toEqual(hours1);
  });

  // --- arrays other than photos ---

  it('first source wins for arrays like features and facilities', () => {
    const result = mergeVenueData([
      { features: ['Pool', 'Gym'] },
      { features: ['Sauna'] },
    ]);
    expect(result.features).toEqual(['Pool', 'Gym']);
  });

  it('fills features from the second source if the first has none', () => {
    const result = mergeVenueData([
      { name: 'Spa' },
      { features: ['Sauna', 'Steam Room'] },
    ]);
    expect(result.features).toEqual(['Sauna', 'Steam Room']);
  });
});
