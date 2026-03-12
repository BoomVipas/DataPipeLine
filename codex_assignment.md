# Codex Assignment — 4 Feature Pack

**Project:** Wander Admin Portal
**Stack:** Next.js 16 App Router · TypeScript strict · Supabase · Tailwind CSS v4 · Google Places API (New)
**Assigned by:** Claude (Reviewer / Architect)

---

## Overview

Implement 4 improvements to the venue management workflow:

1. **Smart tag limiting** — AI autofill generates too many redundant/generic tags
2. **Clear autofill button** — No way to wipe AI-prefilled fields and start over
3. **Selective Google Places refetch tool** — Need cost-efficient targeted refetch by category/status
4. **Delete venue button** — No delete exists on any venue page

Read this entire document before writing any code.

---

## Feature 1 — Smart Tag Limiting

### Problem
Gemini autofill currently generates 6–10 features and 4–6 facilities, including redundant combinations ("All Levels Welcome" + "Beginner Friendly" + "Intermediate" + "Advanced Level") and generic noise ("Restrooms").

### Solution
Two-part fix: tighter prompt + post-processing deduplication rules.

### Part A — Update Gemini Prompt

**File:** `lib/autofill/gemini.ts`

Find the `buildPrompt` function. Change the tag instructions section to:

```
Features (max 5, choose ONLY the most distinctive and specific):
- Pick from: ${COMMON_FEATURES.join(', ')}
- IMPORTANT: If you include "All Levels Welcome", do NOT also include "Beginner Friendly", "Intermediate", "Advanced Level", or "Expert Only" — they are redundant
- Do NOT include "Restrooms" — this is assumed for all venues
- Prefer specific, venue-defining features over generic ones
- Return 0 to 5 items

Facilities (max 4, choose ONLY the most notable):
- Pick from: ${COMMON_FACILITIES.join(', ')}
- Do NOT include "Restrooms" — this is assumed for all venues
- Return 0 to 4 items
```

The prompt currently uses COMMON_FEATURES and COMMON_FACILITIES which are imported from `lib/utils/categories.ts`. Keep using those imports.

### Part B — Post-processing Deduplication

**File:** `lib/autofill/gemini.ts`

After the Gemini response is parsed and features/facilities are filtered to the known sets, apply deduplication rules before returning.

Add this constant near the top of the file (after imports):

```typescript
const FEATURE_DEDUP_RULES: Array<{ trigger: string; remove: string[] }> = [
  {
    trigger: 'All Levels Welcome',
    remove: ['Beginner Friendly', 'Intermediate', 'Advanced Level', 'Expert Only'],
  },
];

const ALWAYS_EXCLUDE_FEATURES = ['Restrooms'];
const ALWAYS_EXCLUDE_FACILITIES = ['Restrooms'];
```

After filtering features/facilities to the COMMON_* sets, apply these rules:

```typescript
// Apply deduplication rules
let dedupedFeatures = filteredFeatures.filter(f => !ALWAYS_EXCLUDE_FEATURES.includes(f));
for (const rule of FEATURE_DEDUP_RULES) {
  if (dedupedFeatures.includes(rule.trigger)) {
    dedupedFeatures = dedupedFeatures.filter(f => !rule.remove.includes(f));
  }
}
// Limit to 5
dedupedFeatures = dedupedFeatures.slice(0, 5);

let dedupedFacilities = filteredFacilities.filter(f => !ALWAYS_EXCLUDE_FACILITIES.includes(f));
// Limit to 4
dedupedFacilities = dedupedFacilities.slice(0, 4);
```

Use `dedupedFeatures` and `dedupedFacilities` in the return value instead of the raw filtered arrays.

### Acceptance Criteria — Feature 1
- [ ] Gemini prompt instructs max 5 features, max 4 facilities
- [ ] Prompt explicitly says don't include "Restrooms" and explains the All Levels dedup rule
- [ ] Post-processing removes redundant skill-level tags when "All Levels Welcome" is present
- [ ] "Restrooms" never appears in returned features or facilities
- [ ] Arrays are sliced to 5 / 4 after dedup

---

## Feature 2 — Clear Autofill Button

### Problem
When Gemini fetches the wrong place, all form fields are prefilled with bad data. The user must manually clear every field or navigate away and back. There is no "reset" action.

### Solution
After autofill completes (Step 2 confirmed), show a "Clear & start over" button that wipes all prefilled fields and resets the form to blank.

### Implementation

**File:** `app/(admin)/venues/new/page.tsx`

Read this file carefully before editing.

The page already has this pattern:
- `autofillData` state holds the autofill result (or `null`)
- `formKey` state is incremented to force VenueForm remount (which re-reads `initial` prop)
- "Clearing" = `setAutofillData(null)` + `setFormKey(k => k + 1)`

Add a `handleClear` function and a clear button that appears when `autofillData !== null`.

```typescript
function handleClear() {
  setAutofillData(null);
  setFormKey(k => k + 1);
}
```

Place the clear button **adjacent to the AutofillInput component**, visible only when autofill data has been applied. It should look consistent with the dark design system:

```tsx
{autofillData && (
  <button
    type="button"
    onClick={handleClear}
    className="flex items-center gap-1.5 text-xs text-ghost hover:text-flame transition-colors"
  >
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
    Clear autofill
  </button>
)}
```

Position it inline with or just below the AutofillInput so the user sees it immediately after autofill completes.

### Acceptance Criteria — Feature 2
- [ ] "Clear autofill" button appears only after autofill has been applied (`autofillData !== null`)
- [ ] Clicking it calls `setAutofillData(null)` and `setFormKey(k => k + 1)`
- [ ] Form resets to fully blank (all fields empty, no prefilled values)
- [ ] Button is visually subtle (ghost color), fits the dark design
- [ ] No regression to normal form flow (save, edit, etc.)

---

## Feature 3 — Selective Google Places Refetch Tool

### Problem
We can't afford to refetch Google Places data for all venues daily. But some venues need fresh data (updated hours, ratings, photos). We need a targeted refetch with filters.

### Solution
A new admin tool page with category + status filters, showing a preview of which venues will be refetched, with a confirm-and-run button.

### New Files

**Page:** `app/(admin)/tools/refetch/page.tsx`
**API Route:** `app/api/venues/refetch/route.ts`

### API Route — `app/api/venues/refetch/route.ts`

```typescript
// POST /api/venues/refetch
// Body: { category_id?: string, status?: string, venue_ids?: string[], dry_run?: boolean }
// Returns: { queued: number, venues: Array<{ id, name, status }> } for dry_run=true
//          { processed: number, updated: number, errors: number } for dry_run=false
```

Implementation steps:

1. Authenticate: use `createClient()` from `@/lib/supabase/server`. If no user → 401.

2. Parse body for filters: `category_id`, `status`, `venue_ids` (array of specific IDs), `dry_run` (boolean, default false).

3. Build Supabase query — select venues matching filters:
   ```typescript
   let query = supabase
     .from('venues')
     .select('id, name, status, google_place_id, category_id, lat, lng')
     .eq('is_deleted', false);

   if (category_id) query = query.eq('category_id', category_id);
   if (status) query = query.eq('status', status);
   if (venue_ids?.length) query = query.in('id', venue_ids);

   // Safety limit — never refetch more than 50 at once
   query = query.limit(50);
   ```

4. If `dry_run === true`: return `{ queued: venues.length, venues: venues.map(v => ({ id: v.id, name: v.name, status: v.status })) }`.

5. If `dry_run === false`: for each venue, call `fetchApprovalPhotos` from `lib/autofill/photos.ts` to refresh photos, then update `venues` row with new `photo_urls`, `hero_image_url`, `google_place_id` (if newly discovered), `rating`, `rating_count`. Track counts of updated vs errors. Return `{ processed, updated, errors }`.

   Import `fetchApprovalPhotos` from `@/lib/autofill/photos`. This function already handles the Google Places search, photo download, and Supabase Storage upload.

   For rating/hours refetch, also call `searchByName` from `@/lib/autofill/google` to get fresh `rating`, `rating_count`, `opening_hours`, `price_level`. Only update if the call succeeds.

6. This route uses the regular `createClient()` (not service role) since admin users have RLS access to venues.

### Page — `app/(admin)/tools/refetch/page.tsx`

This is a client component (`'use client'`).

UI layout (dark design system — `bg-card border border-white/[0.07]` cards, consistent with rest of admin):

```
[Header]
  Wander Ops (eyebrow text)
  Google Places Refetch (h1)

[Filters Card]
  Category filter: <select> with all categories from DB — OR "All Categories"
  Status filter: <select> — All / Draft / Approved / Published / Archived
  Note: "Max 50 venues per run. Refetch updates ratings, hours, and photos."

[Preview Button]
  "Preview venues" → POST /api/venues/refetch { ...filters, dry_run: true }
  Shows a list of venue names/statuses that will be affected

[Results Preview]  (shown after dry run)
  "X venues will be refetched:"
  Simple list: name + status badge
  [Run Refetch] button → POST /api/venues/refetch { ...filters, dry_run: false }

[Run Results] (shown after actual run)
  "Done: X updated, Y errors"
```

Fetch categories for the filter dropdown from Supabase at page load:
```typescript
const supabase = createBrowserClient(...)  // or use fetch('/api/categories') if one exists
```

Actually, since this is a client component, fetch categories via the Supabase browser client. Import `createClient` from `@/lib/supabase/client`.

State: `filters`, `previewResult`, `runResult`, `loading`.

### Add to Sidebar Navigation

**File:** `components/layout/Sidebar.tsx`

Add a "Tools" nav item pointing to `/tools/refetch` (or a parent `/tools` that redirects). The icon can be a wrench/tool SVG:

```tsx
{
  href: '/tools/refetch',
  label: 'Refetch Tool',
  icon: <WrenchIcon />,
}
```

Use a simple wrench SVG (Heroicons style, `strokeWidth={1.5}`):
```tsx
<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-6.837m5.686 5.686l4.655-5.653a2.548 2.548 0 00-3.586-3.586l-6.837 6.837" />
</svg>
```

### Acceptance Criteria — Feature 3
- [ ] `POST /api/venues/refetch` exists and requires auth
- [ ] Supports `dry_run=true` (preview) and `dry_run=false` (execute)
- [ ] Filters: `category_id`, `status`, `venue_ids`
- [ ] Safety limit of 50 venues per run enforced server-side
- [ ] Page at `/tools/refetch` shows filter UI, dry-run preview, and run results
- [ ] Sidebar has Tools nav link
- [ ] Refreshes photos, rating, opening_hours via existing Google Places utilities

---

## Feature 4 — Delete Venue Button

### Problem
There is no way to delete a venue from the admin UI. The venues table has an `is_deleted` column — use soft delete (set `is_deleted = true`) rather than hard DELETE.

### Solution
Add a delete button with a confirmation modal to both the venue detail page and the venue edit page. Soft-delete sets `is_deleted = true` and `status = 'archived'`. If the venue is published (exists in `activity` table), remove it from activity too.

### New API Endpoint — `app/api/venues/[id]/route.ts`

> Check if this file already exists. If it does, add the DELETE handler to it. If not, create it.

```typescript
// DELETE /api/venues/:id
// Soft-deletes the venue: sets is_deleted=true, status='archived'
// Also deletes from activity table if published
```

Implementation:

```typescript
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Soft-delete the venue
  const { error } = await supabase
    .from('venues')
    .update({ is_deleted: true, status: 'archived' })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Remove from activity table if it was published there
  // activity.google_place_id won't match cleanly — use the venue's name+place_id to find it
  // Actually: check if there's an activity row linked to this venue via google_place_id
  const { data: venue } = await supabase
    .from('venues')
    .select('google_place_id')
    .eq('id', id)
    .single();

  if (venue?.google_place_id) {
    await supabase
      .from('activity')
      .update({ is_deleted: true })  // soft-delete in activity too if that column exists
      .eq('google_place_id', venue.google_place_id);
    // Note: if activity doesn't have is_deleted, just skip this step — do NOT hard delete from activity
  }

  return NextResponse.json({ success: true });
}
```

**IMPORTANT:** Do NOT hard-delete from the `activity` table. The mobile app uses it. If `activity` has an `is_deleted` column, set it. If not, skip the activity cleanup step entirely — do not add columns to mobile tables.

Check `types/venue.ts` and `supabase/migration.sql` to confirm whether `activity.is_deleted` exists before writing that code. If unsure, skip it and add a TODO comment.

### UI — Delete Button

Add a delete button to these two pages:

**1. `app/(admin)/venues/[id]/page.tsx`** (venue detail page)

Read this file first. Find the action buttons area (likely near the top header or bottom of page).

Add a delete button that:
1. Shows a confirmation dialog (`window.confirm` is acceptable, or an inline confirmation state)
2. On confirm: calls `DELETE /api/venues/:id`
3. On success: redirects to `/venues`

Since this is a server component page, the delete button must be a client component. Create a small `DeleteVenueButton` client component:

**`components/venues/DeleteVenueButton.tsx`:**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  venueId: string;
  venueName: string;
}

export default function DeleteVenueButton({ venueId, venueName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/venues/${venueId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/venues');
      router.refresh();
    } else {
      setDeleting(false);
      setConfirming(false);
      alert('Failed to delete venue. Please try again.');
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ghost hover:text-red-400 border border-white/[0.07] hover:border-red-400/30 rounded-lg transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
      <span className="text-xs text-red-400">Delete "{venueName}"?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-2 py-1 text-xs font-semibold bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
      >
        {deleting ? 'Deleting…' : 'Confirm'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="px-2 py-1 text-xs text-ghost hover:text-ink transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
```

**2. Venue detail page `app/(admin)/venues/[id]/page.tsx`:**

Import and place `<DeleteVenueButton venueId={venue.id} venueName={venue.name} />` in the header actions area, next to the existing Edit button.

**3. Venue edit page `app/(admin)/venues/[id]/edit/page.tsx`:**

Same — import and add `<DeleteVenueButton>` near the page header or form footer.

### Acceptance Criteria — Feature 4
- [ ] `DELETE /api/venues/:id` endpoint exists
- [ ] Sets `is_deleted = true` and `status = 'archived'` on the venue row
- [ ] `DeleteVenueButton` component exists with two-step confirmation
- [ ] Button appears on venue detail page
- [ ] Button appears on venue edit page
- [ ] After delete, user is redirected to `/venues`
- [ ] Does NOT hard-delete from any mobile app table

---

## File Map

### Create
| File | Purpose |
|------|---------|
| `app/(admin)/tools/refetch/page.tsx` | Refetch tool UI (Feature 3) |
| `app/api/venues/refetch/route.ts` | Refetch API endpoint (Feature 3) |
| `components/venues/DeleteVenueButton.tsx` | Delete button client component (Feature 4) |

### Modify
| File | Change |
|------|--------|
| `lib/autofill/gemini.ts` | Prompt update + post-processing dedup rules (Feature 1) |
| `app/(admin)/venues/new/page.tsx` | Add clear autofill button (Feature 2) |
| `app/api/venues/[id]/route.ts` | Add DELETE handler (Feature 4) — create if doesn't exist |
| `app/(admin)/venues/[id]/page.tsx` | Add DeleteVenueButton (Feature 4) |
| `app/(admin)/venues/[id]/edit/page.tsx` | Add DeleteVenueButton (Feature 4) |
| `components/layout/Sidebar.tsx` | Add Tools nav item (Feature 3) |

### Do NOT touch
- Any table in `supabase/migration.sql` mobile sections (`activity`, `user`, `party`, etc.)
- `lib/autofill/photos.ts` — use it, don't modify it
- `lib/autofill/google.ts` — use it, don't modify it
- `types/venue.ts` — only add types if strictly necessary

---

## Project Conventions

- **Dark design system tokens:** `bg-canvas`, `bg-panel`, `bg-card`, `bg-raised`, `text-ink`, `text-dim`, `text-ghost`, `text-flame`
- **Cards:** `bg-card border border-white/[0.07] rounded-xl`
- **Accent color:** `flame` (#FF5533) for CTAs, active states
- **Fonts:** `font-display` (Syne) for headings, `font-sans` (Outfit) for body
- **Supabase table:** `category` (singular, not `categories`)
- **Auth client:** `createClient()` from `@/lib/supabase/server` in API routes / server components; `createClient()` from `@/lib/supabase/client` in client components
- **TypeScript strict** — no `any` without comment

---

## Final Checks Before Submitting

Run `npx tsc --noEmit` and fix all errors. Then verify:

- [ ] Feature 1: Autofill a fitness venue → confirm ≤5 features, ≤4 facilities, no "Restrooms", no skill-level redundancy
- [ ] Feature 2: Autofill a venue on `/venues/new` → confirm "Clear autofill" button appears → click it → form is blank
- [ ] Feature 3: Visit `/tools/refetch` → select a category → click Preview → confirm list shows → click Run → confirm results
- [ ] Feature 4: Open any venue detail page → click Delete → confirm prompt → confirm redirect to `/venues`
- [ ] `npx tsc --noEmit` passes with zero errors

---

*Written by Claude (Sonnet 4.6) as reviewer/architect. Codex handles implementation. Claude reviews the diff.*
