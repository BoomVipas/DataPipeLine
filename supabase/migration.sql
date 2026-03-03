-- ============================================================
-- Wander Admin — Database Migration (Admin Tables Only)
-- Run this in the Supabase SQL Editor
--
-- This creates ADMIN-SPECIFIC tables only.
-- The mobile app tables (activity, category, user, party, etc.)
-- already exist and are NOT touched here.
-- ============================================================

-- Enable extensions (safe to re-run)
CREATE EXTENSION IF NOT EXISTS "earthdistance" CASCADE;
CREATE EXTENSION IF NOT EXISTS "cube" CASCADE;

-- ============================================================
-- TABLE: admin_users
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================================
-- TABLE: venues (Admin Staging)
-- category_id references the mobile app's existing `category` table.
-- DO NOT recreate the `category` table — it already exists.
-- ============================================================
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  name TEXT NOT NULL,

  -- Location
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  district TEXT,
  nearest_bts_mrt TEXT,
  google_place_id TEXT,

  -- Classification (references mobile app's existing category table)
  category_id UUID REFERENCES category(id),
  sub_category TEXT,
  features TEXT[],
  facilities TEXT[],

  -- Contact & Links
  phone TEXT,
  website_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  line_id TEXT,

  -- Operating Info
  opening_hours JSONB,
  price_level INTEGER CHECK (price_level BETWEEN 1 AND 4),
  price_thb INTEGER,
  booking_method TEXT CHECK (booking_method IN ('walk_in', 'phone', 'line', 'website', 'wander')),
  booking_url TEXT,

  -- Content
  short_description TEXT,
  long_description TEXT,
  hero_image_url TEXT,
  photo_urls TEXT[],

  -- External Ratings
  rating NUMERIC(2,1),
  rating_count INTEGER,

  -- Auto-fill Metadata
  autofill_sources JSONB,
  autofill_raw_data JSONB,

  -- Pipeline Status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'published', 'archived')),

  -- Audit
  created_by UUID REFERENCES admin_users(id),
  updated_by UUID REFERENCES admin_users(id),
  approved_by UUID REFERENCES admin_users(id),
  approved_at TIMESTAMPTZ DEFAULT NULL,
  published_by UUID REFERENCES admin_users(id),
  published_at TIMESTAMPTZ DEFAULT NULL,

  -- Reference to the published activity record
  activity_id UUID,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_venues_status ON venues(status);
CREATE INDEX IF NOT EXISTS idx_venues_category ON venues(category_id);
CREATE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);
CREATE INDEX IF NOT EXISTS idx_venues_is_deleted ON venues(is_deleted);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS venues_updated_at ON venues;
CREATE TRIGGER venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: venue_notes (Admin Activity Log)
-- ============================================================
CREATE TABLE IF NOT EXISTS venue_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  author_id UUID REFERENCES admin_users(id),
  note_type TEXT NOT NULL DEFAULT 'comment'
    CHECK (note_type IN ('comment', 'status_change', 'autofill_log', 'edit_log')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_notes_venue ON venue_notes(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_notes_created ON venue_notes(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read own record"
  ON admin_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin full access on venues"
  ON venues FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Admin full access on venue_notes"
  ON venue_notes FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

-- ============================================================
-- STORAGE: Create manually in Dashboard → Storage → New bucket
-- Name: venue-photos  |  Type: Public
-- ============================================================

-- ============================================================
-- AFTER RUNNING: Create user in Auth dashboard, then:
-- INSERT INTO admin_users (user_id, display_name, email) VALUES
--   ('<uuid-from-auth>', 'Your Name', 'your@email.com');
-- ============================================================
