import type { VenueSubCategory } from '@/types/venue';

// Fallback labels (used when DB category name isn't available)
export const SUB_CATEGORY_LABELS: Record<VenueSubCategory, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  mindful: 'Mindful',
  recovery: 'Recovery',
  games: 'Games',
  chill: 'Chill',
  wander: 'Wander',
  weird: 'Weird',
  bar: 'Bar',
  club: 'Club',
};

// Maps Google Places types to Wander category slugs
const GOOGLE_TYPES_MAP: Record<string, string> = {
  gym: 'fitness',
  fitness_center: 'fitness',
  sports_complex: 'fitness',
  stadium: 'fitness',
  swimming_pool: 'fitness',
  rock_climbing: 'fitness',
  spa: 'wellness',
  beauty_salon: 'wellness',
  yoga_studio: 'wellness',
  physiotherapist: 'wellness',
  health: 'wellness',
  cafe: 'casual',
  restaurant: 'casual',
  bakery: 'casual',
  coffee_shop: 'casual',
  movie_theater: 'casual',
  amusement_center: 'casual',
  bar: 'nightlife',
  night_club: 'nightlife',
  casino: 'nightlife',
  liquor_store: 'nightlife',
};

export function mapGoogleTypesToSlug(types: string[]): string | undefined {
  for (const type of types) {
    const slug = GOOGLE_TYPES_MAP[type];
    if (slug) return slug;
  }
  return undefined;
}

export const BANGKOK_DISTRICTS = [
  'Bang Kapi', 'Bang Khae', 'Bang Khen', 'Bang Kho Laem', 'Bang Kok Noi',
  'Bang Kok Yai', 'Bang Na', 'Bang Phlat', 'Bang Rak', 'Bang Sue',
  'Bueng Kum', 'Chatuchak', 'Chom Thong', 'Din Daeng', 'Don Mueang',
  'Dusit', 'Huai Khwang', 'Khan Na Yao', 'Khlong San', 'Khlong Sam Wa',
  'Khlong Toei', 'Lat Krabang', 'Lat Phrao', 'Lak Si', 'Min Buri',
  'Nong Chok', 'Nong Khaem', 'Pathum Wan', 'Phasi Charoen', 'Phaya Thai',
  'Phra Khanong', 'Phra Nakhon', 'Pom Prap Sattru Phai', 'Prawet',
  'Rat Burana', 'Ratchathewi', 'Sai Mai', 'Samphanthawong', 'Saphan Sung',
  'Sathon', 'Taling Chan', 'Thawi Watthana', 'Thon Buri', 'Thung Khru',
  'Wang Thonglang', 'Yan Nawa',
];

// Canonical feature tags — shown in the app as badges.
// IMPORTANT: Gemini is instructed to ONLY use these exact strings.
// Add new tags here first before using them anywhere.
export const COMMON_FEATURES = [
  // Skill level
  'Beginner Friendly', 'All Levels Welcome', 'Intermediate', 'Advanced Level', 'Expert Only',
  // Session format
  'Drop-in Welcome', 'Class Schedule', 'Private Sessions', 'Group Classes', 'Reservations Required',
  // Audience
  'Kids Welcome', 'Pet Friendly', 'Members Only',
  // Equipment
  'Gear Included', 'Gear Rental',
  // Amenities / vibe
  'Air Conditioned', 'Outdoor Area', 'Rooftop', 'Open 24/7',
  'Pool', 'Sauna', 'Steam Room', 'Hot Tub',
  // Instructors
  'Certified Instructors',
  // Nightlife / social
  'Live Music', 'DJ', 'Happy Hour', 'BYOB', 'Food Available', 'Cocktail Bar',
] as const;

// Canonical facility tags — physical on-site amenities.
export const COMMON_FACILITIES = [
  'Parking', 'Valet', 'Locker Room', 'Showers', 'Changing Room',
  'WiFi', 'Wheelchair Accessible', 'Elevator', 'Security', 'CCTV',
  'Card Payment', 'Cash Only', 'Cafe', 'Restrooms',
] as const;
