import type { VenueSubCategory, OperatingHours } from './venue';

export type AutofillInputType = 'auto' | 'name' | 'google_maps' | 'website';

export interface AutofillRequest {
  input: string;
  input_type?: AutofillInputType;
}

export type SourceStatus = 'idle' | 'fetching' | 'found' | 'failed' | 'skipped';

export interface AutofillSourceResult {
  status: SourceStatus;
  error?: string;
}

export interface AutofillVenueData {
  // Matches activity/venues table field names
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  district?: string;
  nearest_bts_mrt?: string;
  google_place_id?: string;

  phone?: string;
  website_url?: string;
  instagram_url?: string | null;
  facebook_url?: string | null;
  line_id?: string;

  opening_hours?: OperatingHours;
  price_level?: 1 | 2 | 3 | 4;
  price_thb?: number;
  booking_method?: string;
  booking_url?: string;

  features?: string[];          // e.g. ["All Levels", "Gear Included"]
  facilities?: string[];        // e.g. ["Parking", "Showers"]

  short_description?: string;   // 2-3 sentence summary (app cards)
  long_description?: string;    // Full description (app detail page)
  hero_image_url?: string;
  photo_urls?: string[];

  rating?: number;
  rating_count?: number;

  // Slug-based suggestion — form resolves to UUID after loading categories
  suggested_category_slug?: string;
  suggested_sub_category?: VenueSubCategory;

  sources_used: string[];
  description_is_ai?: boolean;
}

export interface AutofillResponse {
  success: true;
  venue: AutofillVenueData;
  raw_data?: Record<string, unknown>;
}

export interface AutofillErrorResponse {
  success: false;
  error: string;
}
