# Wander Admin — Codex Agent Instructions

> This file is automatically read by OpenAI Codex before every task.
> It is the Codex equivalent of CLAUDE.md.

---

## Project Overview

This is the **Wander Admin Portal** — a Next.js admin dashboard for managing venues that appear in the Wander mobile app. Admins can create, autofill, approve, and publish venues into the mobile app's `activity` table.

**Stack:** Next.js 16.1.6 · TypeScript strict · Tailwind CSS v4 · Supabase (Postgres + Auth + Storage) · Google Places API (New) · Gemini API

---

## Critical Database Rules

### Tables you MUST NOT touch (mobile app, already exist)
- `activity` — what the mobile app reads
- `category` — 8 categories (singular name, NOT `categories`)
- `user`, `party`, `participation`, `message`, `review`, `events`, etc.

### Admin tables (safe to modify)
- `admin_users`, `venues`, `venue_notes`, `venue_photos`

### Key constraints
- Table name is `category` (singular), never `categories`
- Category uses `icon_key` field, NOT `slug`
- Supabase join syntax: `category:category(id,name,icon_key)`
- `venues.category_id` REFERENCES `category(id)`
- `activity.created_by` → FK to mobile `user` table → always set to `null` when publishing from admin
- `venue_photos.venue_id` → NOT NULL FK to `venues(id)` — always required

---

## Environment Variables

| Variable | Where available |
|----------|----------------|
| `EXPO_PUBLIC_SUPABASE_URL` | browser + server |
| `EXPO_PUBLIC_SUPABASE_KEY` | browser + server (anon/publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only — bypasses RLS |
| `GOOGLE_GEMINI_API_KEY` | server only |
| `GOOGLE_PLACES_API_KEY` | server only |
| `NEXT_PUBLIC_APP_URL` | browser + server |

---

## Architecture Patterns

### Auth
- Auth middleware is in `proxy.ts` (NOT `middleware.ts`), function named `proxy`
- New admins added via SQL have `user_id=null` — use service role client (`SUPABASE_SERVICE_ROLE_KEY`) to look them up in the auth callback

### Supabase clients
- `lib/supabase/server.ts` → `createClient()` — server-side, uses cookies for auth
- For RLS-bypass operations (e.g. looking up admins by email): create a service role client directly with `createClient(url, serviceRoleKey)`

### Photo Storage System
Photos from Google Places are stored permanently in Supabase Storage bucket `venue-photos`.

**Flow:**
1. `ensurePhotosStored(photos, venueId, supabase)` in `lib/autofill/photos.ts`
   - Checks `venue_photos` table by `google_photo_name` (deduplication)
   - If not cached: downloads from Google Places API, uploads to Storage as `{uuid}.{ext}`
   - Inserts row into `venue_photos` table
   - Returns array of permanent public URLs
2. Called during autofill (if `venue_id` is available) and on first approval

**Never use:**
- `getPhotoUrl` from google.ts — returns temporary signed URLs that expire
- Index-based file names like `0.jpg` or `{placeId}/1.jpg`
- `upsert: true` on Storage uploads

### Publish to Activity
`app/api/venues/[id]/status/route.ts` syncs approved venues to the `activity` table.
- `created_by: null` — required to avoid FK violation (activity.created_by → mobile user table)
- Updates `venues.activity_id` to reference the published activity row

### Clickable table rows
`<tr>` cannot be a `<Link>`. Pattern: wrap each `<td>` content in `<Link href="...">`, set `<td className="p-0">`.

### ReadOnly arrays
`COMMON_FEATURES` / `COMMON_FACILITIES` use `as const` → type is `readonly string[]`.
`ChipInput.suggestions` prop must be typed `readonly string[]`.

---

## Code Style Rules

- **TypeScript strict mode** — no `any` without a comment explaining why, no non-null assertions without a comment
- **No `console.log`** in production paths except prefixed debug logs like `[photos]`, `[autofill]`
- **Import order:** external packages → `@/lib/` → `@/types/` → relative
- **Error handling:** all async functions must handle errors with try/catch or `.catch()`
- **No feature flags or backwards-compat shims** — just change the code
- **No docstrings or comments on unchanged code** — only comment new logic that isn't self-evident
- **Tailwind only** — no inline styles, no CSS modules

---

## File Structure Reference

```
app/
  (admin)/          — Admin UI pages (dashboard, venues, etc.)
  api/
    autofill/       — Gemini + Google Places autofill
    venues/         — CRUD + status transitions
    photos/upload/  — Manual photo upload
  auth/callback/    — OAuth callback (service role lookup for new admins)

lib/
  autofill/
    google.ts       — Google Places search + place lookup
    photos.ts       — Photo download + Supabase Storage (ensurePhotosStored, fetchApprovalPhotos)
    gemini.ts       — Gemini AI search
    claude.ts       — Claude description generation
    merge.ts        — Merge autofill data from multiple sources
  supabase/
    server.ts       — Server-side Supabase client (cookie-based auth)
    client.ts       — Browser-side Supabase client
  utils/
    categories.ts   — COMMON_FEATURES, COMMON_FACILITIES (as const)
    slug.ts         — generateSlug, makeUniqueSlug

components/
  venues/
    VenueForm.tsx   — Main venue create/edit form
    AutofillInput.tsx — Autofill bar (2-step: Gemini → Google compare)
    ChipInput.tsx   — Tag/chip input (suggestions: readonly string[])
  dashboard/
    SubCategoryChart.tsx — Half-pie recharts chart

types/
  venue.ts          — Venue, Activity, VenuePhoto, AdminUser, VenueNote interfaces
  autofill.ts       — AutofillVenueData interface

supabase/
  migration.sql     — Full schema (admin tables only — do NOT include mobile app tables)

scripts/
  screenshot.ts     — Puppeteer screenshot utility
```

---

## Skills

### frontend-design
Located at `.agents/skills/frontend-design/SKILL.md`.

Use this skill when building or redesigning any UI component, page, or interface. It provides guidelines for creating production-grade, visually distinctive frontend code that avoids generic AI aesthetics.

**Trigger conditions:**
- Building new pages or components from scratch
- Redesigning existing UI to improve visual quality
- Any task where visual output matters (forms, dashboards, charts, modals, etc.)

**How to apply:** Read `.agents/skills/frontend-design/SKILL.md` before writing any frontend code for UI tasks, then follow its design thinking process and aesthetic guidelines.

---

## Before You Start Any Task

1. Read `codex_assignment.md` in the project root — this contains your specific task, PRD, and acceptance criteria
2. Run `npx tsc --noEmit` to see the current TypeScript state
3. Never modify mobile app tables
4. When done: run `npx tsc --noEmit` again and confirm zero errors

---

## Supabase Project

**Project ID:** `tgyyblctsqcqpzgizsae`
**Region:** Southeast Asia
