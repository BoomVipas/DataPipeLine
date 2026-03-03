# Wander Admin — Venue Data Pipeline

An internal admin portal for curating and approving venues for the **Wander** mobile app. It uses AI (Gemini + Google Places) to auto-fill venue data, lets admins review and compare sources, then publishes approved venues to the live Supabase database.

---

## What This Does

```
You type a venue name
       ↓
Step 1 — Gemini 2.5 Flash searches the web and returns structured data
       ↓
Step 2 (optional) — Compare Gemini result vs live Google Maps API side-by-side
       ↓
Admin reviews, edits, and approves the venue
       ↓
Venue is written to Supabase (live mobile app database)
```

The **Process Log** panel shows a real-time terminal-style log of every API call made during the fetch — so you can see exactly what is happening behind the scenes.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| AI Autofill | Google Gemini 2.5 Flash + Google Search grounding |
| Maps Data | Google Places API (Text Search + Place Details) |
| Styling | Tailwind CSS |

---

## Project Structure

```
DataPipeline/
├── app/
│   ├── (admin)/              # Protected admin pages
│   │   ├── dashboard/        # Stats overview
│   │   └── venues/           # Venue list, detail, add new
│   ├── (auth)/               # Login page
│   └── api/                  # Server-side API routes
│       ├── autofill/         # Gemini fetch + Google compare
│       ├── categories/       # Live category tree from Supabase
│       ├── dashboard/        # Stats endpoints
│       └── venues/           # CRUD for venues
├── components/
│   ├── ui/                   # Shared UI (Badge, etc.)
│   └── venues/               # VenueForm, AutofillInput, MobilePreview, ComparePanel
├── lib/
│   ├── autofill/             # gemini.ts — Gemini API integration
│   ├── supabase/             # Supabase client helpers
│   └── utils/                # Category labels, formatting
├── types/                    # TypeScript interfaces (venue, autofill)
├── supabase/migration.sql    # SQL to run in Supabase to create admin tables
└── proxy.ts                  # Next.js 16 middleware (auth guard)
```

---

## How the Autofill Works

### Step 1 — Gemini AI Fetch
- Calls `POST /api/autofill` with the venue name
- Server calls **Gemini 2.5 Flash** with Google Search grounding enabled
- Gemini searches the web in real time and returns structured JSON:
  - Name, address, lat/lng, district, phone, website
  - Opening hours (per day, 24h format)
  - Price level, rating, review count
  - Short description, suggested category
- Form is pre-filled with the result

### Step 2 — Compare with Google Maps (optional)
- Calls `POST /api/autofill/compare`
- Runs **Gemini** and **Google Places API** in parallel
- Side-by-side comparison panel appears showing both sources
- Fields that match are marked ✓
- Fields that differ let you pick which source to trust
- Default: Google for factual data, Gemini for descriptions
- Click **Apply to Form** to merge your selections

---

## Prerequisites

- Node.js 18+
- A Supabase project with the Wander mobile app schema
- Google Cloud project with these APIs enabled:
  - Generative Language API (Gemini)
  - Places API (New)

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/BoomVipas/DataPipeLine.git
cd DataPipeLine
npm install
```

### 2. Create environment file

Create a file called `.env.local` in the project root:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google APIs
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
GOOGLE_PLACES_API_KEY=your-google-places-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Where to get these:**
> - Supabase keys → [supabase.com](https://supabase.com) → your project → Settings → API
> - Gemini key → [aistudio.google.com](https://aistudio.google.com) → Get API Key
> - Places key → [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials

### 3. Run the Supabase migration

Go to your Supabase dashboard → **SQL Editor** and run the contents of `supabase/migration.sql`. This creates the admin tables (`admin_users`, `venues`, `venue_notes`).

Then register your admin account by running this in the SQL Editor (replace the UUID with your Supabase Auth user ID):

```sql
INSERT INTO admin_users (user_id, display_name, email)
VALUES ('your-auth-user-uuid', 'Your Name', 'your@email.com');
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running in Production

```bash
# Build
npm run build

# Start
npm start
```

To keep it running persistently (e.g. on a server), use PM2:

```bash
npm install -g pm2
npm run build
pm2 start "npm start" --name wander-admin
pm2 save
```

---

## Login

After setup, log in at `/login` with the admin email and password you registered in Supabase Auth.

---

## Key Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/dashboard` | Overview stats |
| Venues list | `/venues` | All submitted venues with status |
| Add venue | `/venues/new` | AI-powered autofill form |
| Venue detail | `/venues/[id]` | Review, edit, approve/reject with mobile app preview |
