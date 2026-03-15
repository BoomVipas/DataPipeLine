import type { VenueSubCategory } from '@/types/venue';

// Fallback labels (used when DB category name isn't available)
export const SUB_CATEGORY_LABELS: Record<VenueSubCategory, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  mindful: 'Mindful',
  recovery: 'Recovery',
  games: 'Games',
  chill: 'Chill',
  bar: 'Bar',
  club: 'Club',
};

// Subcategories per parent category key — source of truth for the form dropdown.
// Uses VenueSubCategory values directly so it's always consistent with what's saved.
export const SUB_CATEGORIES_BY_CATEGORY: Record<string, VenueSubCategory[]> = {
  fitness:   ['indoor', 'outdoor'],
  wellness:  ['mindful', 'recovery'],
  casual:    ['games', 'chill'],
  nightlife: ['bar', 'club'],
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
  'Walk-in Welcome', 'Appointment Required', 'Day Pass Available', 'Monthly Membership',
  // Audience
  'Kids Welcome', 'Kid Friendly', 'Pet Friendly', 'Members Only',
  'Good for Groups', 'Good for Solo',
  // Equipment / supplies
  'Gear Included', 'Gear Rental', 'Equipment Provided', 'Mat Provided',
  // Instructors / staff
  'Certified Instructors', 'Certified Therapists', 'Personal Training',
  // Amenities / vibe
  'Air Conditioned', 'Outdoor Area', 'Outdoor Seating', 'Rooftop', 'Rooftop Bar', 'Open 24/7',
  'Pool', 'Sauna', 'Steam Room', 'Hot Tub', 'Ice Bath', 'Peaceful Environment',
  'Scenic Views', 'Instagrammable', 'Working Space',
  // Food & drink
  'Live Music', 'DJ', 'Happy Hour', 'BYOB', 'Food Available', 'Cocktail Bar',
  'Craft Beer', 'Wine Selection', 'Coffee & Drinks', 'Food Menu', 'Desserts', 'Vegan Options',
  'Food & Drinks Available',
  // Nightlife specific
  'Dance Floor', 'Bottle Service', 'VIP Section', 'Guest List', 'Dress Code',
  'Open Bar Nights', 'Late Night', 'Sports Screening', 'Live Performance',
  'EDM', 'Hip-Hop', 'House Music',
  // Wellness specific
  'Traditional Thai Massage', 'Aromatherapy', 'Hot Stone', 'Compression Therapy',
  'Couples Available',
  // Activity / casual
  'Board Games', 'Video Games', 'VR Available', 'Tournaments', 'Competitive',
  'Reservations Available',
] as const;

// Feature suggestions shown in the form, filtered by category.
// Keeps the tag chip input focused on relevant options.
export const FEATURES_BY_CATEGORY: Record<string, readonly string[]> = {
  fitness: [
    'Beginner Friendly', 'All Levels Welcome', 'Intermediate', 'Advanced Level', 'Expert Only',
    'Drop-in Welcome', 'Class Schedule', 'Private Sessions', 'Group Classes', 'Reservations Required',
    'Kids Welcome', 'Members Only', 'Gear Included', 'Gear Rental',
    'Certified Instructors', 'Air Conditioned', 'Outdoor Area', 'Open 24/7',
    'Pool', 'Sauna', 'Steam Room', 'Hot Tub',
  ],
  wellness: [
    'Beginner Friendly', 'All Levels Welcome', 'Drop-in Welcome', 'Private Sessions',
    'Group Classes', 'Reservations Required', 'Members Only',
    'Certified Instructors', 'Air Conditioned', 'Outdoor Area', 'Rooftop',
    'Pool', 'Sauna', 'Steam Room', 'Hot Tub',
  ],
  casual: [
    'Kids Welcome', 'Pet Friendly', 'Air Conditioned', 'Outdoor Area', 'Rooftop',
    'Open 24/7', 'Food Available', 'Reservations Required',
    'Live Music', 'BYOB',
  ],
  nightlife: [
    'Live Music', 'DJ', 'Happy Hour', 'BYOB', 'Food Available', 'Cocktail Bar',
    'Rooftop', 'Outdoor Area', 'Members Only', 'Reservations Required',
    'Air Conditioned', 'Open 24/7',
  ],
};

// Feature suggestions filtered by sub_category — more specific than FEATURES_BY_CATEGORY.
export const FEATURES_BY_SUB_CATEGORY: Record<string, readonly string[]> = {
  bar: [
    'Live Music', 'DJ', 'Cocktail Bar', 'Happy Hour', 'Craft Beer', 'Wine Selection',
    'Sports Screening', 'Outdoor Seating', 'Rooftop Bar', 'Late Night', 'Food Available',
    'Bottle Service', 'Pet Friendly', 'Good for Groups',
  ],
  club: [
    'DJ', 'Live Performance', 'Dance Floor', 'Bottle Service', 'VIP Section',
    'Rooftop', 'Guest List', 'Dress Code', 'EDM', 'Hip-Hop', 'House Music',
    'Open Bar Nights', 'Late Night',
  ],
  indoor: [
    'Beginner Friendly', 'All Levels Welcome', 'Advanced Level',
    'Personal Training', 'Group Classes', 'Drop-in Welcome', 'Day Pass Available',
    'Monthly Membership', 'Certified Instructors', 'Equipment Provided',
    'Air Conditioned', 'Open 24/7',
  ],
  outdoor: [
    'Beginner Friendly', 'All Levels Welcome', 'Advanced Level',
    'Group Classes', 'Certified Instructors', 'Equipment Provided',
    'Pet Friendly', 'Scenic Views',
  ],
  mindful: [
    'Beginner Friendly', 'All Levels Welcome', 'Drop-in Welcome',
    'Private Sessions', 'Group Classes', 'Certified Instructors',
    'Mat Provided', 'Air Conditioned', 'Peaceful Environment', 'Reservations Required',
  ],
  recovery: [
    'Walk-in Welcome', 'Appointment Required', 'Certified Therapists',
    'Traditional Thai Massage', 'Aromatherapy', 'Hot Stone',
    'Sauna', 'Steam Room', 'Ice Bath', 'Compression Therapy', 'Couples Available',
  ],
  chill: [
    'Pet Friendly', 'Kid Friendly', 'Outdoor Seating', 'Air Conditioned',
    'Good for Groups', 'Good for Solo', 'Working Space', 'Coffee & Drinks',
    'Food Menu', 'Desserts', 'Vegan Options', 'Instagrammable', 'BYOB',
  ],
  games: [
    'Walk-in Welcome', 'Reservations Available', 'Kid Friendly', 'Good for Groups',
    'Food & Drinks Available', 'Board Games', 'Video Games', 'VR Available',
    'Tournaments', 'Competitive',
  ],
};

// Facility suggestions filtered by sub_category.
export const FACILITIES_BY_SUB_CATEGORY: Record<string, readonly string[]> = {
  bar:      ['Parking', 'Valet', 'Security', 'Restrooms', 'Card Payment', 'WiFi'],
  club:     ['Parking', 'Valet', 'Security', 'Restrooms', 'Card Payment', 'Coat Check'],
  indoor:   ['Locker Room', 'Showers', 'Changing Room', 'Parking', 'WiFi', 'Restrooms'],
  outdoor:  ['Parking', 'Restrooms', 'WiFi'],
  mindful:  ['Locker Room', 'Showers', 'Changing Room', 'Restrooms', 'WiFi'],
  recovery: ['Locker Room', 'Showers', 'Changing Room', 'Restrooms', 'WiFi', 'Parking'],
  chill:    ['WiFi', 'Parking', 'Restrooms', 'Card Payment', 'Wheelchair Accessible'],
  games:    ['WiFi', 'Parking', 'Restrooms', 'Card Payment'],
};

export const CATEGORY_ICONS: Record<string, string> = {
  fitness:   '/icons/activity/Fitness.png',
  wellness:  '/icons/activity/Wellness.png',
  casual:    '/icons/activity/Casual.png',
  nightlife: '/icons/activity/Night_Life.png',
};

export const SUB_CATEGORY_ICONS: Record<string, string> = {
  indoor:   '/icons/activity/indoor.png',
  outdoor:  '/icons/activity/outdoor.png',
  mindful:  '/icons/activity/Meditate.png',
  recovery: '/icons/activity/Recovery.png',
  games:    '/icons/activity/Game.png',
  chill:    '/icons/activity/Chill.png',
  bar:      '/icons/activity/Bar.png',
  club:     '/icons/activity/club.png',
};

// Canonical facility tags — physical on-site amenities.
export const COMMON_FACILITIES = [
  'Parking', 'Valet', 'Locker Room', 'Showers', 'Changing Room',
  'WiFi', 'Wheelchair Accessible', 'Elevator', 'Security', 'CCTV',
  'Card Payment', 'Cash Only', 'Cafe', 'Restrooms',
] as const;
