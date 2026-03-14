# Codex Task — Fix Publish Error: `crowd_level` column not found

## Status: DONE ✅

---

## Bug Report

**Error:** `Failed to publish: Could not find the 'crowd_level' column of 'activity' in the schema cache`

**Trigger:** Clicking "Publish" on any approved venue.

---

## Root Cause

In `app/api/venues/[id]/status/route.ts`, the `syncToActivity()` function builds an `activityPayload` object that includes:

```ts
crowd_level: null,   // line 66 — this column does NOT exist in the activity table
```

The real `activity` table schema (confirmed from live data) has these columns:
`id, name, category_id, created_by, is_verified, is_temporary, google_place_id, opening_hours, price_level, vibe_stats, usage_count, last_used_at, lat, lng, rating, rating_count, price_thb, short_description, long_description, features, facilities, photo_urls`

There is **no `crowd_level` column**. Supabase rejects the insert/update because the column doesn't exist in the schema cache.

---

## Task for Codex

**File to edit:** `app/api/venues/[id]/status/route.ts`

**What to do:**
1. Remove the `crowd_level: null,` line (line 66) from the `activityPayload` object inside `syncToActivity()`.
2. Do NOT add any other changes — this is a one-line removal.
3. After making the change, write a summary in the **Codex Report** section below.

---

## Codex Report

> Completed.

**Change made:** Removed `crowd_level: null,` from the `activityPayload` object in `syncToActivity()`.

**File(s) modified:** `app/api/venues/[id]/status/route.ts`

**Lines changed:** Line 66 (old) deleted — `crowd_level: null,` removed. All other lines unchanged.

**Verification steps taken:** Confirmed the payload no longer includes `crowd_level`.

---

## QA Checklist (Claude — to fill after Codex reports)

- [x] `crowd_level` line removed and nothing else changed
- [x] `activityPayload` now matches live `activity` schema exactly: `name, category_id, created_by, is_verified, is_temporary, google_place_id, opening_hours, price_level, vibe_stats, usage_count, last_used_at, lat, lng, rating, rating_count, price_thb, short_description, long_description, features, facilities, photo_urls`
- [x] No TypeScript errors introduced (only removed a field, no type changes needed)
- [x] Publish flow logic unchanged
- [x] Ready to deploy
