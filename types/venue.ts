// ============================================================
// Admin staging: categories, venues, notes
// Activity: the table the mobile app reads
// ============================================================

export type VenueSubCategory =
  | 'indoor'    // fitness
  | 'outdoor'   // fitness
  | 'mindful'   // wellness
  | 'recovery'  // wellness
  | 'games'     // casual
  | 'chill'     // casual
  | 'wander'    // casual
  | 'weird'     // casual
  | 'bar'       // nightlife
  | 'club';     // nightlife

export type VenueStatus = 'draft' | 'approved' | 'published' | 'archived';

export type BookingMethod = 'walk_in' | 'phone' | 'line' | 'website' | 'wander';

export type CrowdLevel = 'low' | 'medium' | 'high';

export interface DayHours {
  open: string;  // "HH:mm" 24-hour
  close: string; // "HH:mm" 24-hour
}

// Empty array = closed, single = normal, two = split shift
export type OperatingHours = {
  monday: DayHours[];
  tuesday: DayHours[];
  wednesday: DayHours[];
  thursday: DayHours[];
  friday: DayHours[];
  saturday: DayHours[];
  sunday: DayHours[];
};

// ============================================================
// Category (from the mobile app's `category` table — hierarchical)
// ============================================================
export interface CategoryChild {
  id: string;
  key: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  key: string;       // e.g. "fitness", "wellness" (level 1)
  icon_key: string;  // e.g. "barbell", "leaf"
  sub_categories: CategoryChild[];
}

export interface AutofillSources {
  google_places?: { fetched_at: string; place_id: string };
  website?: { fetched_at: string; url: string };
}

// ============================================================
// Venue (admin staging table)
// ============================================================
export interface Venue {
  id: string;
  slug: string | null;
  name: string;

  // Location
  address: string | null;
  lat: number | null;
  lng: number | null;
  district: string | null;
  nearest_bts_mrt: string | null;
  google_place_id: string | null;

  // Classification
  category_id: string | null;
  sub_category: VenueSubCategory | null;
  features: string[] | null;      // Feature badges: "Gear Included", "All Levels", etc.
  facilities: string[] | null;    // Facilities: "Parking", "Locker Room", etc.

  // Contact & Links
  phone: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  line_id: string | null;

  // Operating Info
  opening_hours: OperatingHours | null;
  price_level: 1 | 2 | 3 | 4 | null;
  price_thb: number | null;        // Actual price in Thai Baht (e.g. 300 = 300฿/session)
  booking_method: BookingMethod | null;
  booking_url: string | null;

  // Content
  short_description: string | null;  // 2-3 sentences (shown in app cards)
  long_description: string | null;   // Full description (shown on detail page)
  hero_image_url: string | null;
  photo_urls: string[] | null;

  // External Ratings
  rating: number | null;
  rating_count: number | null;

  // Auto-fill Metadata
  autofill_sources: AutofillSources | null;
  autofill_raw_data: Record<string, unknown> | null;

  // Pipeline Status (admin staging)
  status: VenueStatus;

  // Future: Evaluation
  tier: string | null;
  wander_score: number | null;
  last_evaluated_at: string | null;
  next_evaluation_due: string | null;
  safety_gate_passed: boolean | null;

  // Audit
  created_by: string | null;
  updated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_by: string | null;
  published_at: string | null;

  // Reference to published activity record
  activity_id: string | null;

  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;

  // Joined
  category?: Category;
}

export type VenueInsert = Omit<
  Venue,
  'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at' | 'category'
>;
export type VenueUpdate = Partial<VenueInsert>;

// ============================================================
// Activity (mobile app table — written on publish)
// ============================================================
export interface Activity {
  id: string;
  name: string;
  category_id: string | null;
  created_by: string | null;
  is_verified: boolean;
  is_temporary: boolean;
  google_place_id: string | null;
  opening_hours: OperatingHours | null;
  price_level: number | null;
  crowd_level: CrowdLevel | null;             // Community-set via app
  vibe_stats: Record<string, unknown> | null; // Community-set via app
  usage_count: number;
  last_used_at: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  rating_count: number | null;
  price_thb: number | null;
  short_description: string | null;
  long_description: string | null;
  features: string[] | null;
  facilities: string[] | null;
  venue_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Admin User + Venue Notes
// ============================================================
export interface AdminUser {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  created_at: string;
}

export interface VenueNote {
  id: string;
  venue_id: string;
  author_id: string;
  note_type: 'comment' | 'status_change' | 'autofill_log' | 'edit_log';
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  author?: Pick<AdminUser, 'display_name' | 'email'>;
}
