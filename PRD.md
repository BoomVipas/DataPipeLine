# WANDER — Admin Venue Curation Pipeline
## Product Requirements Document (PRD)
### Version 1.0 | February 2026

---

## 1. EXECUTIVE SUMMARY

### 1.1 What We're Building
An internal admin web application ("Wander Admin") that allows the Wander founding team to discover, curate, enrich, and publish venue listings to the Wander platform. The tool automates data gathering from multiple external sources while keeping a human in the loop for quality decisions.

### 1.2 Why
Wander's credibility depends on curated, high-quality venue listings. For launch, the team needs to rapidly onboard 50–100+ venues with rich, accurate data. Manually researching and entering every venue detail is too slow. This tool lets an admin input a venue name or link and auto-populates 80%+ of the listing data, leaving humans to validate, edit, and publish.

### 1.3 Launch Pipeline Flow (Simplified for v1)
```
Admin finds a venue → Inputs name or URL into admin tool
        ↓
Auto-fill pulls data from Google Places, IG, FB, Wongnai, website
        ↓
Admin reviews pre-populated venue card, edits as needed
        ↓
Admin assigns category + sub-category
        ↓
Admin publishes → Venue goes live in the Wander app
        ↓
(LATER) On-site evaluation & tiering added post-launch
```

> **NOTE:** On-site evaluation, scoring metrics, and tiering (Wander Listed / Recommended / Select) are NOT part of v1. The schema should support them (future-proof), but the UI does not need evaluation/scoring features yet. v1 is purely: find → auto-fill → review → publish.

---

## 2. TECH STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js 14+ (App Router) | React-based, SSR where needed |
| **Language** | TypeScript | Strict mode |
| **Styling** | Tailwind CSS | Consistent with modern stack |
| **Database** | Supabase (PostgreSQL) | Already used by Wander mobile app |
| **Auth** | Supabase Auth | Email/password for admin accounts |
| **Storage** | Supabase Storage | Venue photos bucket |
| **API Routes** | Next.js API routes (Route Handlers) | Proxies to external APIs, keeps keys server-side |
| **External APIs** | Google Places API, Meta Graph API, Web scraping | All called server-side only |
| **Deployment** | Vercel | Natural fit for Next.js |

---

## 3. USERS & AUTHENTICATION

### 3.1 Users
All 4 co-founders have **equal admin access**. No role hierarchy needed for v1.
- Boom (Full-stack dev)
- Title (Full-stack dev)
- Tan (Full-stack dev)
- Euro (Operations & Strategy)

### 3.2 Auth Flow
- Supabase Auth with **email + password** sign-in
- Admin accounts are **invite-only** — no public sign-up page
- Protected by a `admin_users` table that whitelist specific Supabase user IDs
- All routes in the admin app require authentication
- Session management via Supabase Auth helpers for Next.js (`@supabase/ssr`)

### 3.3 Security Requirements
- All external API keys stored as **server-side environment variables only** (never exposed to client)
- All auto-fill API calls go through **Next.js API routes** (server-side proxy)
- Supabase Row Level Security (RLS) enabled on all tables
- RLS policy: Only users whose `auth.uid()` exists in `admin_users` can read/write
- CORS restricted to the admin domain only
- Rate limiting on auto-fill endpoints (prevent accidental API bill spikes)

---

## 4. DATABASE SCHEMA (Supabase / PostgreSQL)

### 4.1 Assumption
> **ASSUMPTION:** The existing Wander app may already have a `venues` or `places` table. This schema is designed to either **replace** it or **extend** it. The engineering team should reconcile with the existing mobile app schema. Fields marked with `[APP]` are the ones the mobile app needs to display listings. Fields marked with `[ADMIN]` are internal-only.

### 4.2 Tables

#### `admin_users`
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
```

#### `venues` (Main Table)
```sql
CREATE TABLE venues (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,                              -- [APP] URL-friendly name
  name_en TEXT NOT NULL,                         -- [APP] English name
  name_th TEXT,                                  -- [APP] Thai name
  
  -- Location
  address_en TEXT,                               -- [APP]
  address_th TEXT,                               -- [APP]
  latitude DOUBLE PRECISION,                     -- [APP] GPS
  longitude DOUBLE PRECISION,                    -- [APP] GPS
  district TEXT,                                 -- [APP] Bangkok district (e.g., "Sathorn", "Thonglor")
  nearest_bts_mrt TEXT,                          -- [APP] Nearest station name
  google_place_id TEXT,                          -- [ADMIN] For re-fetching data
  
  -- Classification
  category TEXT NOT NULL,                        -- [APP] Primary category (enum, see 4.3)
  sub_category TEXT,                             -- [APP] Sub-category (e.g., "Muay Thai", "Rock Climbing")
  tags TEXT[],                                   -- [APP] Flexible tags array
  
  -- Contact & Links
  phone TEXT,                                    -- [APP]
  website_url TEXT,                              -- [APP]
  instagram_url TEXT,                            -- [APP]
  facebook_url TEXT,                             -- [APP]
  line_id TEXT,                                  -- [APP] LINE official account
  wongnai_url TEXT,                              -- [ADMIN]
  
  -- Operating Info
  operating_hours JSONB,                         -- [APP] Structured hours (see 4.4)
  price_range INTEGER CHECK (price_range BETWEEN 1 AND 4), -- [APP] 1=฿, 2=฿฿, 3=฿฿฿, 4=฿฿฿฿
  booking_method TEXT,                           -- [APP] "walk_in", "phone", "line", "website", "wander"
  booking_url TEXT,                              -- [APP] If bookable online
  
  -- Content
  description_en TEXT,                           -- [APP] 2-3 sentence description
  description_th TEXT,                           -- [APP] Thai description
  hero_image_url TEXT,                           -- [APP] Primary photo URL
  photo_urls TEXT[],                             -- [APP] Array of photo URLs
  
  -- External Ratings (internal reference only)
  google_rating NUMERIC(2,1),                    -- [ADMIN]
  google_review_count INTEGER,                   -- [ADMIN]
  wongnai_rating NUMERIC(2,1),                   -- [ADMIN]
  wongnai_review_count INTEGER,                  -- [ADMIN]
  
  -- Auto-fill Metadata
  autofill_sources JSONB,                        -- [ADMIN] Which sources were used, timestamps
  autofill_raw_data JSONB,                       -- [ADMIN] Raw API responses for debugging
  
  -- Pipeline Status
  status TEXT NOT NULL DEFAULT 'draft',          -- [ADMIN] "draft", "in_review", "approved", "published", "archived"
  
  -- Future: Evaluation (schema ready, not used in v1 UI)
  tier TEXT DEFAULT NULL,                        -- "listed", "recommended", "select" (NULL until evaluated)
  wander_score NUMERIC(2,1) DEFAULT NULL,        -- Composite score (NULL until evaluated)
  last_evaluated_at TIMESTAMPTZ DEFAULT NULL,
  next_evaluation_due TIMESTAMPTZ DEFAULT NULL,
  safety_gate_passed BOOLEAN DEFAULT NULL,
  
  -- Audit
  created_by UUID REFERENCES admin_users(id),
  updated_by UUID REFERENCES admin_users(id),
  published_by UUID REFERENCES admin_users(id),
  published_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Indexes
CREATE INDEX idx_venues_status ON venues(status);
CREATE INDEX idx_venues_category ON venues(category);
CREATE INDEX idx_venues_location ON venues USING gist (
  ll_to_earth(latitude, longitude)
);
CREATE INDEX idx_venues_slug ON venues(slug);
```

#### `venue_notes` (Internal Comments / Activity Log)
```sql
CREATE TABLE venue_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  author_id UUID REFERENCES admin_users(id),
  note_type TEXT NOT NULL DEFAULT 'comment',     -- "comment", "status_change", "autofill_log", "edit_log"
  content TEXT NOT NULL,
  metadata JSONB,                                -- Extra data (e.g., old_status, new_status for status changes)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_venue_notes_venue ON venue_notes(venue_id);
```

#### `venue_evaluations` (Future — v2, schema only)
```sql
CREATE TABLE venue_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES admin_users(id),
  
  -- Safety Gate
  safety_passed BOOLEAN NOT NULL,
  safety_notes TEXT,
  
  -- Universal Metrics (1-5)
  score_intentional_design INTEGER CHECK (score_intentional_design BETWEEN 1 AND 5),
  score_service_warmth INTEGER CHECK (score_service_warmth BETWEEN 1 AND 5),
  score_atmospheric_coherence INTEGER CHECK (score_atmospheric_coherence BETWEEN 1 AND 5),
  score_accessibility INTEGER CHECK (score_accessibility BETWEEN 1 AND 5),
  score_value_alignment INTEGER CHECK (score_value_alignment BETWEEN 1 AND 5),
  score_repeatability INTEGER CHECK (score_repeatability BETWEEN 1 AND 5),
  
  -- Category-Specific Metrics (1-5)
  score_category_1 INTEGER CHECK (score_category_1 BETWEEN 1 AND 5),
  score_category_2 INTEGER CHECK (score_category_2 BETWEEN 1 AND 5),
  score_category_3 INTEGER CHECK (score_category_3 BETWEEN 1 AND 5),
  category_metric_names JSONB,                   -- Names of the 3 metrics used
  
  -- Computed
  universal_avg NUMERIC(2,1),
  category_avg NUMERIC(2,1),
  wander_score NUMERIC(2,1),                     -- (universal_avg * 0.6) + (category_avg * 0.4)
  
  -- Evaluator Input
  recommendation TEXT CHECK (recommendation IN ('yes', 'maybe', 'no')),
  photo_urls TEXT[],
  notes TEXT,
  
  visit_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_evaluations_venue ON venue_evaluations(venue_id);
```

### 4.3 Category Enum Values
Based on the Wander app's current categories:
```
"fitness"      -- ⚽ Fitness
"nightlife"    -- 🍸 Night Life
"casual"       -- ☕ Casual
"wellness"     -- 🧘 Wellness
"outdoor"      -- 🏕 Outdoor
"club"         -- 🎉 Club
"chill"        -- 🛋 Chill
"meditate"     -- 🧘 Meditate
"indoor"       -- 🔍 Indoor
"bar"          -- 🍸 Bar
"game"         -- 🎮 Game
"recovery"     -- 💊 Recovery
```

### 4.4 Operating Hours JSONB Format
```json
{
  "monday":    { "open": "09:00", "close": "22:00" },
  "tuesday":   { "open": "09:00", "close": "22:00" },
  "wednesday": { "open": "09:00", "close": "22:00" },
  "thursday":  { "open": "09:00", "close": "22:00" },
  "friday":    { "open": "09:00", "close": "23:00" },
  "saturday":  { "open": "10:00", "close": "23:00" },
  "sunday":    null
}
```
`null` = closed that day. This structure supports irregular hours per day.

### 4.5 Row Level Security Policies
```sql
-- Enable RLS on all tables
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Only admin users can do anything
CREATE POLICY "Admin full access on venues"
  ON venues FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Admin full access on venue_notes"
  ON venue_notes FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Admin full access on venue_evaluations"
  ON venue_evaluations FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Admin read own record"
  ON admin_users FOR SELECT
  USING (auth.uid() = user_id);
```

> **IMPORTANT FOR MOBILE APP:** The Wander mobile app needs READ access to `venues` WHERE `status = 'published'`. This requires an additional RLS policy or a separate public-facing view/function. Coordinate with the mobile team on this.

---

## 5. AUTO-FILL SYSTEM

### 5.1 Architecture
```
[Admin UI]  →  [Next.js API Route]  →  [External API / Scraper]
                    ↓
              [Normalize & Merge]
                    ↓
              [Return Unified Venue Card]
```
All external calls happen **server-side** in Next.js API route handlers. API keys are never sent to the browser.

### 5.2 Input Methods

The auto-fill endpoint accepts ONE of these inputs:

| Input Type | Example | Detection Logic |
|-----------|---------|----------------|
| **Venue name** | `"Flow Space Yoga"` | No URL pattern detected → Google Places text search |
| **Google Maps URL** | `https://maps.google.com/...` or `https://goo.gl/maps/...` | Contains `maps.google` or `goo.gl/maps` → Extract Place ID |
| **Instagram URL** | `https://instagram.com/flowspaceyoga` | Contains `instagram.com` → Extract username |
| **Facebook URL** | `https://facebook.com/flowspaceyoga` | Contains `facebook.com` → Extract page identifier |
| **Wongnai URL** | `https://www.wongnai.com/restaurants/...` | Contains `wongnai.com` → Extract venue slug |
| **Generic website** | `https://flowspaceyoga.com` | No known platform pattern → Web scraper |

### 5.3 API Route: `/api/autofill`

**Method:** `POST`

**Request Body:**
```json
{
  "input": "Flow Space Yoga",
  "input_type": "auto"
}
```
`input_type` can be `"auto"` (detect), `"name"`, `"google_maps"`, `"instagram"`, `"facebook"`, `"wongnai"`, or `"website"`. Default `"auto"`.

**Response Body:**
```json
{
  "success": true,
  "venue": {
    "name_en": "Flow Space Yoga",
    "name_th": "โฟลว์สเปซ โยคะ",
    "address_en": "123 Sukhumvit Soi 39, Khlong Toei, Bangkok 10110",
    "address_th": "123 สุขุมวิท ซอย 39...",
    "latitude": 13.7340,
    "longitude": 100.5690,
    "district": "Khlong Toei",
    "nearest_bts_mrt": "Phrom Phong BTS",
    "google_place_id": "ChIJ...",
    "phone": "+66-2-XXX-XXXX",
    "website_url": "https://flowspaceyoga.com",
    "instagram_url": "https://instagram.com/flowspaceyoga",
    "facebook_url": "https://facebook.com/flowspaceyoga",
    "line_id": "@flowspace",
    "operating_hours": { ... },
    "price_range": 2,
    "google_rating": 4.6,
    "google_review_count": 128,
    "description_en": "A tranquil yoga studio in the heart of Sukhumvit...",
    "photo_urls": [
      "https://lh3.googleusercontent.com/...",
      "https://lh3.googleusercontent.com/..."
    ],
    "suggested_category": "wellness",
    "suggested_sub_category": "Yoga",
    "sentiment_summary": "Predominantly positive (4.6 avg). Praised for peaceful atmosphere and skilled instructors.",
    "sources_used": ["google_places", "instagram", "website"]
  },
  "raw_data": { ... }
}
```

### 5.4 Source-Specific Logic

#### Source 1: Google Places API (Primary)
- **API:** Google Places API (New) — `searchText` and `placeDetails`
- **Triggered by:** Name search, Google Maps URL, or as cross-reference for other sources
- **Fields extracted:** name, address, coordinates, phone, hours, rating, review count, photos (up to 10), website, types (for category suggestion)
- **Photo handling:** Google Places returns photo references. Use the Places Photos API to get actual URLs. Store URLs directly (don't download and re-host for v1).
- **Rate limit consideration:** Cache results by `google_place_id` for 24 hours to avoid redundant calls

#### Source 2: Instagram
- **Method:** Given an IG URL or username, use the Instagram Basic Display API or, if unavailable, a lightweight public profile scraper
- **Fields extracted:** Bio, follower count, profile photo, recent post count, external link from bio
- **Cross-reference:** Use venue name from IG bio + location to find the Google Places listing
- **Fallback:** If IG API is restricted, this source returns partial data (just the URL is stored) — not a blocker

#### Source 3: Facebook
- **Method:** Facebook Graph API (Page Public Content) if available, otherwise scrape public page info
- **Fields extracted:** Page name, about, address, phone, hours, category, rating
- **Cross-reference:** Use address/name to match with Google Places
- **Note:** Facebook API access may require a Facebook App with Page Public Content Access permission. If not available at launch, treat as manual-entry field.

#### Source 4: Wongnai
- **Method:** Web scraper (Wongnai does not have a public API)
- **Fields extracted:** Venue name, rating, review count, address, price range, photos, menu items
- **Implementation:** Server-side fetch of the Wongnai page → Parse HTML for structured data (JSON-LD or meta tags) → Extract fields
- **Fallback:** If scraping is blocked, admin manually enters Wongnai rating

#### Source 5: Generic Website Scraper
- **Method:** Server-side fetch → Parse for structured data
- **Priority parsing order:**
  1. JSON-LD (`<script type="application/ld+json">`) — richest source
  2. Open Graph meta tags (`og:title`, `og:description`, `og:image`)
  3. Schema.org microdata
  4. `<meta>` tags (description, keywords)
  5. `<title>` tag as fallback name
- **Fields extracted:** Name, description, images, address, phone, hours (whatever is available)

### 5.5 Data Merge Priority
When multiple sources return the same field, use this priority order:
```
Google Places > Facebook > Website > Wongnai > Instagram
```
Exception: **Photos** are merged (not replaced) from all sources, de-duplicated by URL.

### 5.6 AI-Assisted Features (Via API or Prompt)

These can be implemented as simple server-side LLM calls (Anthropic Claude API) or rule-based logic:

| Feature | Implementation | Priority |
|---------|---------------|----------|
| **Category suggestion** | Map Google Places `types` to Wander categories. If ambiguous, use LLM with venue description. | P0 (launch) |
| **Description generation** | LLM prompt: "Write a 2-3 sentence venue description in this style: [brand voice examples]. Data: [merged venue data]." Admin always reviews before publishing. | P1 (nice-to-have for launch) |
| **Sentiment summary** | LLM prompt: "Summarize the sentiment of these reviews in 1 sentence: [sample reviews from Google]." | P2 (post-launch) |
| **Duplicate detection** | Query Supabase: fuzzy match on `name_en` + proximity match on lat/lng within 100m radius. Alert admin. | P0 (launch) |

---

## 6. API ROUTES (Next.js Route Handlers)

### 6.1 Auto-Fill
```
POST   /api/autofill                  -- Input name/URL → returns merged venue data
POST   /api/autofill/google           -- Direct Google Places lookup
POST   /api/autofill/instagram        -- IG profile data
POST   /api/autofill/facebook         -- FB page data
POST   /api/autofill/wongnai          -- Wongnai scrape
POST   /api/autofill/website          -- Generic website scrape
```

### 6.2 Venues (CRUD)
```
GET    /api/venues                    -- List all venues (with filters: status, category, search)
GET    /api/venues/[id]               -- Get single venue
POST   /api/venues                    -- Create new venue (from auto-fill data + admin edits)
PATCH  /api/venues/[id]               -- Update venue fields
PATCH  /api/venues/[id]/status        -- Change status (draft → in_review → approved → published)
DELETE /api/venues/[id]               -- Soft delete (set is_deleted = true)
```

### 6.3 Venue Notes
```
GET    /api/venues/[id]/notes         -- Get all notes for a venue
POST   /api/venues/[id]/notes         -- Add a note
```

### 6.4 Dashboard / Analytics
```
GET    /api/dashboard/stats           -- Counts: total, by status, by category, recent activity
GET    /api/venues/duplicates         -- Check for potential duplicates (by name + location)
```

### 6.5 Photos
```
POST   /api/photos/upload             -- Upload photo to Supabase Storage, return public URL
```

---

## 7. UI SCREENS & COMPONENTS

### 7.1 Screen Map
```
/login                    -- Supabase Auth login form
/dashboard                -- Overview stats + recent activity + quick actions
/venues                   -- Venue list (table with filters + search)
/venues/new               -- New venue form (auto-fill + manual entry)
/venues/[id]              -- Venue detail view (all data + notes + activity log)
/venues/[id]/edit         -- Edit venue form
```

### 7.2 Screen: Login (`/login`)
- Simple email + password form
- Supabase Auth sign-in
- Redirect to `/dashboard` on success
- No "sign up" link (invite-only)
- Show error messages for invalid credentials

### 7.3 Screen: Dashboard (`/dashboard`)
**Purpose:** At-a-glance health of the venue pipeline.

**Content:**
- **Stat cards (top row):**
  - Total Venues (published)
  - Draft / In Review count
  - Venues by category (small bar chart or pill counts)
  - Most recent publish date
- **Recent Activity feed:**
  - Last 10 actions (venue created, published, edited) with timestamps and who did it
- **Quick Actions:**
  - "Add New Venue" button (prominent)
  - "View All Venues" link
- **Category Coverage Map:**
  - Simple grid showing how many venues per category. Highlight gaps (0 or <3 venues).

### 7.4 Screen: Venue List (`/venues`)
**Purpose:** Browse, search, and filter all venues in the pipeline.

**Content:**
- **Search bar:** Fuzzy search by name (English and Thai)
- **Filters:**
  - Status: All / Draft / In Review / Published / Archived (tabs or dropdown)
  - Category: Multi-select dropdown
  - District: Dropdown
- **Table columns:**
  - Hero image (thumbnail)
  - Name (English)
  - Category + Sub-category (badge)
  - District
  - Status (color-coded badge)
  - Google Rating
  - Created date
  - Published date (if published)
  - Actions: View / Edit / Publish / Archive
- **Sorting:** Click column headers to sort
- **Pagination:** 20 per page
- **Bulk actions (stretch goal):** Select multiple → bulk publish / archive

### 7.5 Screen: New Venue (`/venues/new`)
**Purpose:** The core curation screen. This is where the magic happens.

**Layout: Two-phase UX**

**Phase 1: Auto-Fill Input**
- Large input field at top: "Enter venue name or paste a URL..."
- Input type auto-detected (show detected type as badge: "Google Maps URL detected")
- "Fetch Data" button
- Loading state with progress indicators per source:
  ```
  ✅ Google Places — Found
  ⏳ Instagram — Searching...
  ✅ Website — Parsed
  ❌ Wongnai — Not found
  ⏳ Facebook — Searching...
  ```
- Once complete, transition to Phase 2

**Phase 2: Review & Edit**
- Pre-populated form with ALL venue fields
- Each field shows a **source badge** (e.g., "via Google Places" in gray text) so admin knows where data came from
- Fields are **editable** — admin can override any auto-filled value
- **Sections:**

  **Section A: Basic Info**
  - Name (EN) + Name (TH)
  - Category (dropdown) + Sub-category (text input with suggestions)
  - Tags (multi-input chips)

  **Section B: Location**
  - Address (EN) + Address (TH)
  - District (dropdown of Bangkok districts)
  - Nearest BTS/MRT (dropdown or text)
  - Mini map preview showing pin location (using coordinates)
  - "Adjust Pin" — allow admin to drag pin on map if coordinates are slightly off

  **Section C: Contact & Links**
  - Phone, Website, Instagram, Facebook, LINE ID
  - Wongnai URL
  - Booking method (dropdown: Walk-in / Phone / LINE / Website / Wander)
  - Booking URL

  **Section D: Operating Info**
  - Hours editor (7-day grid: for each day, open time + close time pickers, or toggle "Closed")
  - Price range (1-4 selector: ฿ / ฿฿ / ฿฿฿ / ฿฿฿฿)

  **Section E: Content**
  - Description (EN) — textarea with character count. If AI-generated, shown with "AI Draft" badge
  - Description (TH) — textarea
  - Hero image selector (click to choose from fetched photos)
  - Photo gallery — grid of all fetched photos with checkboxes. Admin can:
    - Check/uncheck which photos to include
    - Reorder photos
    - Upload additional photos manually
    - Set hero image

  **Section F: External Ratings (Read-only reference)**
  - Google rating + review count
  - Wongnai rating + review count
  - (Not shown to Wander app users — just for admin context)

  **Section G: Admin Notes**
  - Text area for internal notes ("Found this on Lemon8, trending", "Owner is a friend of X", etc.)

- **Duplicate Warning:** If the system detects a potential duplicate (name/location match), show a yellow banner at top: "⚠️ Possible duplicate: [linked venue name]. Is this the same place?"

- **Action buttons (bottom):**
  - "Save as Draft" — saves to DB with status `draft`
  - "Submit for Review" — saves with status `in_review`
  - "Publish Now" — saves with status `published` (live in app immediately)
  - "Cancel" — discard and return to list

### 7.6 Screen: Venue Detail (`/venues/[id]`)
**Purpose:** View all venue data, activity log, and take actions.

**Content:**
- **Header:** Venue name, category badge, status badge, tier badge (if set)
- **Hero image** (large) + photo gallery
- **Info panels** (read-only display of all fields, organized same as edit form)
- **Activity log** (timeline of all venue_notes: comments, status changes, edits)
  - Auto-generated entries: "Euro changed status from draft to published" with timestamp
  - Manual comments from team members
- **Action buttons:**
  - Edit
  - Change Status (dropdown: Draft / In Review / Published / Archived)
  - Re-run Auto-fill (refresh data from external sources)
  - Delete (soft delete with confirmation modal)
- **Add Note:** Text input at bottom of activity log for adding comments

### 7.7 Screen: Edit Venue (`/venues/[id]/edit`)
- Same form as `/venues/new` Phase 2, pre-populated with existing data
- "Save Changes" + "Cancel" buttons
- On save, auto-log a venue_note: "Boom edited: name_en, description_en, price_range" (list changed fields)

---

## 8. NON-FUNCTIONAL REQUIREMENTS

### 8.1 Performance
- Auto-fill should complete within **10 seconds** (all sources)
- Individual source timeout: **5 seconds** each (if a source times out, skip it and continue with others)
- Venue list page loads within **2 seconds** for up to 500 venues
- Image thumbnails should be lazy-loaded

### 8.2 Error Handling
- If an auto-fill source fails, show which source failed and continue with available data
- Never block the entire auto-fill because one source is down
- Show clear error messages to admin (not raw error codes)
- Log all API errors to `venue_notes` as `autofill_log` type for debugging

### 8.3 Mobile Responsiveness
- The admin tool is primarily used on **desktop** but should be **usable on tablet**
- The on-site evaluation scorecard (v2) MUST be mobile-optimized — but that's not in v1 scope

### 8.4 Data Integrity
- All writes go through Supabase RLS — no direct DB manipulation from client
- `updated_at` auto-updates on every write (use Supabase trigger or application logic)
- Activity log (venue_notes) is **append-only** — notes cannot be edited or deleted
- Soft deletes only — never hard delete a venue

---

## 9. ENVIRONMENT VARIABLES REQUIRED

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...           # Server-side only, for admin operations

# Google Places
GOOGLE_PLACES_API_KEY=AIza...                # Server-side only

# Facebook (optional for v1, can add later)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# Anthropic (for AI features)
ANTHROPIC_API_KEY=sk-ant-...                 # Server-side only, for description generation

# App
NEXT_PUBLIC_APP_URL=https://admin.wander-th.com
```

---

## 10. IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)
- [ ] Next.js project setup with TypeScript + Tailwind
- [ ] Supabase connection + auth integration
- [ ] Database tables created (run SQL migrations)
- [ ] RLS policies applied
- [ ] Login page functional
- [ ] Basic layout shell (sidebar nav, header with user info)

### Phase 2: Core CRUD (Week 2)
- [ ] Venue list page with search, filters, sorting, pagination
- [ ] Create venue form (manual entry, no auto-fill yet)
- [ ] Edit venue form
- [ ] Venue detail page
- [ ] Status management (draft → published flow)
- [ ] Venue notes / activity log
- [ ] Photo upload to Supabase Storage

### Phase 3: Auto-Fill (Week 3)
- [ ] `/api/autofill` route with Google Places integration
- [ ] Auto-fill UI (input bar + source progress indicators)
- [ ] Instagram data fetching (or URL storage if API restricted)
- [ ] Facebook data fetching (or URL storage)
- [ ] Wongnai web scraper
- [ ] Generic website scraper (JSON-LD, OG tags)
- [ ] Data merge logic with source priority
- [ ] Duplicate detection query

### Phase 4: Polish (Week 4)
- [ ] Dashboard with stats and category coverage
- [ ] Map preview on venue form (with draggable pin)
- [ ] AI-generated descriptions (Claude API)
- [ ] Category auto-suggestion
- [ ] Bulk publish from list view
- [ ] Error handling + loading states polish
- [ ] Testing with real Bangkok venues (20+ venues run through pipeline)

---

## 11. ASSUMPTIONS & OPEN QUESTIONS

### Assumptions (Override if incorrect)
| # | Assumption | Impact if Wrong |
|---|-----------|----------------|
| A1 | The Wander mobile app will read from the same `venues` table with a `WHERE status = 'published'` filter | If the app uses a different table, we need a sync mechanism or view |
| A2 | Google Places API key is available or can be created quickly | Auto-fill is severely limited without it — this is the highest priority API |
| A3 | Supabase Storage is used for photos rather than a CDN like Cloudflare Images | If using external CDN, photo upload logic changes |
| A4 | The admin tool is deployed to a separate domain (e.g., `admin.wander-th.com`) from the main website | Affects CORS and auth configuration |
| A5 | Photos from Google Places can be referenced by URL (not downloaded and re-hosted) for v1 | Google Places photo URLs expire — may need to download and store in Supabase Storage eventually |
| A6 | The existing app doesn't have a venues table yet, or it can be replaced | If it does, schema reconciliation is needed first |

### Open Questions for Team
1. **Does a venues table already exist in Supabase?** If so, what's the current schema?
2. **Google Places API key** — do you have one? What billing tier?
3. **Deployment** — Should this be on Vercel, or does the team prefer another host?
4. **Domain** — What domain for the admin tool? `admin.wander-th.com`?
5. **Photo storage** — Google photo URLs expire after a few days. Should v1 auto-download and store in Supabase Storage, or is URL reference OK for now and fix later?
6. **Mobile app integration** — How does the current mobile app fetch venue data? Direct Supabase query? API? This determines how published venues appear in the app.
7. **Wongnai scraping legality** — Is the team comfortable with scraping Wongnai? It's in a gray area. Alternative: admin manually enters Wongnai data.

---

## 12. FUTURE SCOPE (NOT in v1 — documented for reference)

These features are defined in the Wander Evaluation Framework document and will be built in later phases:

- **On-site evaluation scorecard** (mobile-optimized form with universal + category metrics)
- **Tiering system** (Wander Listed / Recommended / Select badges)
- **Re-evaluation cycle** (6-month timer, user report triggers, ownership change detection)
- **Evaluator calibration tools** (cross-compare scores between evaluators)
- **Pre-screening criteria UI** (Pass/Flag/Fail for 7 online criteria)
- **Venue owner portal** (claim listing, respond to reviews)
- **Public API** for the Wander mobile app (if moving away from direct Supabase queries)
- **Automated monitoring** (track external rating changes, detect closures)

---

## 13. SUCCESS CRITERIA

### v1 is successful when:
1. An admin can go from "I found a venue" to "it's live in the Wander app" in **under 15 minutes**
2. Auto-fill successfully populates **80%+ of fields** for venues with a Google Places listing
3. **50 venues** are curated and published through the pipeline within 2 weeks of launch
4. All 4 founders can log in and use the tool independently without technical support
5. No API keys or sensitive data are exposed to the client browser
6. Published venues appear correctly in the Wander mobile app

---

*End of PRD*