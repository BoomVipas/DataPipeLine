# Wander Admin — Claude Code Instructions

> Read by Claude Code at the start of every session.

---

## Project Overview

This is the **Wander Admin Portal** — a Next.js admin dashboard for managing venues that appear in the Wander mobile app. Admins can create, autofill, approve, and publish venues into the mobile app's `activity` table.

**Stack:** Next.js 16.1.6 · TypeScript strict · Tailwind CSS v4 · Supabase (Postgres + Auth + Storage) · Google Places API (New) · Gemini API

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
- New admins added via SQL have `user_id=null` — use service role client to look them up in the auth callback

### Supabase clients
- `lib/supabase/server.ts` → `createClient()` — server-side, uses cookies for auth
- For RLS-bypass operations: create a service role client directly with `createClient(url, serviceRoleKey)`

### Photo Storage System
Photos from Google Places are stored permanently in Supabase Storage bucket `venue-photos`.
- `ensurePhotosStored(photos, venueId, supabase)` in `lib/autofill/photos.ts`
- Never use `getPhotoUrl` from google.ts — returns temporary signed URLs that expire

### Publish to Activity
`app/api/venues/[id]/status/route.ts` syncs approved venues to the `activity` table.
- `created_by: null` — required to avoid FK violation

### Clickable table rows
`<tr>` cannot be a `<Link>`. Pattern: wrap each `<td>` content in `<Link href="...">`, set `<td className="p-0">`.

### ReadOnly arrays
`COMMON_FEATURES` / `COMMON_FACILITIES` use `as const` → type is `readonly string[]`.
`ChipInput.suggestions` prop must be typed `readonly string[]`.

---

## Code Style Rules

- **TypeScript strict mode** — no `any` without a comment explaining why
- **No `console.log`** in production paths except prefixed debug logs like `[photos]`, `[autofill]`
- **Import order:** external packages → `@/lib/` → `@/types/` → relative
- **Error handling:** all async functions must handle errors with try/catch or `.catch()`
- **No feature flags or backwards-compat shims** — just change the code
- **Tailwind only** — no inline styles, no CSS modules

---

## Supabase Project

**Project ID:** `tgyyblctsqcqpzgizsae`
**Region:** Southeast Asia
