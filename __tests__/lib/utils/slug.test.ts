import { describe, it, expect } from 'vitest';
import { generateSlug, makeUniqueSlug } from '@/lib/utils/slug';

describe('generateSlug', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(generateSlug('Flow Space Yoga')).toBe('flow-space-yoga');
  });

  it('strips special characters', () => {
    expect(generateSlug('Flow Space Yoga!')).toBe('flow-space-yoga');
    // "&" and "." are stripped; the surrounding spaces collapse into one hyphen
    expect(generateSlug("Roast & Co.")).toBe('roast-co');
  });

  it('collapses multiple consecutive hyphens', () => {
    // "Foo & Bar" → "foo  bar" → "foo--bar" → "foo-bar" after collapse
    expect(generateSlug('Foo & Bar')).toBe('foo-bar');
  });

  it('trims leading/trailing whitespace before converting', () => {
    expect(generateSlug('  Trim Me  ')).toBe('trim-me');
  });

  it('handles numbers in the name', () => {
    expect(generateSlug('Studio 47')).toBe('studio-47');
  });

  it('handles already lowercase input', () => {
    expect(generateSlug('yoga studio')).toBe('yoga-studio');
  });

  it('returns an empty string for an empty input', () => {
    expect(generateSlug('')).toBe('');
  });

  it('handles names with only special characters', () => {
    expect(generateSlug('!!!')).toBe('');
  });

  it('preserves existing hyphens', () => {
    expect(generateSlug('Well-Being Center')).toBe('well-being-center');
  });
});

describe('makeUniqueSlug', () => {
  it('returns the desired slug when it is not taken', () => {
    expect(makeUniqueSlug('yoga-studio', ['crossfit-bkk'])).toBe('yoga-studio');
  });

  it('returns desired slug when existing list is empty', () => {
    expect(makeUniqueSlug('yoga-studio', [])).toBe('yoga-studio');
  });

  it('appends -2 when the desired slug already exists', () => {
    expect(makeUniqueSlug('yoga-studio', ['yoga-studio'])).toBe('yoga-studio-2');
  });

  it('skips to -3 when both desired and -2 are taken', () => {
    expect(makeUniqueSlug('yoga-studio', ['yoga-studio', 'yoga-studio-2'])).toBe('yoga-studio-3');
  });

  it('finds the first available counter with many collisions', () => {
    const existing = ['cafe', 'cafe-2', 'cafe-3', 'cafe-4'];
    expect(makeUniqueSlug('cafe', existing)).toBe('cafe-5');
  });

  it('is case-sensitive — treats "Yoga" and "yoga" as different slugs', () => {
    // generateSlug always lowercases, so in practice slugs are always lowercase.
    // makeUniqueSlug itself is case-sensitive by contract.
    expect(makeUniqueSlug('Yoga', ['yoga'])).toBe('Yoga');
  });
});
