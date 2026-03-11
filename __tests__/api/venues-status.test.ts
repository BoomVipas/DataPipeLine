/**
 * Tests for Fix 2: runtime validation of the `status` value in
 * PATCH /api/venues/[id]/status
 *
 * An attacker or buggy client passing an invalid string (e.g. "hacked")
 * should receive 400 "Invalid status value" instead of being able to
 * trigger undefined behaviour in the transition logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/autofill/photos', () => ({
  fetchApprovalPhotos: vi.fn().mockResolvedValue({ photoUrls: [], placeId: null }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_USER  = { id: 'user-123' };
const MOCK_ADMIN = { id: 'admin-456', display_name: 'Admin' };
const MOCK_VENUE = {
  status: 'draft',
  activity_id: null,
  name: 'Test Venue',
  lat: null,
  lng: null,
  google_place_id: null,
  hero_image_url: null,
  photo_urls: null,
};

function makePatchRequest(body: Record<string, unknown>, venueId = 'venue-abc') {
  return new NextRequest(`http://localhost/api/venues/${venueId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Builds a minimal chainable Supabase mock. */
function makeChain(results: Array<{ data: unknown; error: unknown }>) {
  let callIndex = 0;
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'order', 'limit'].forEach(
    m => { chain[m] = vi.fn().mockReturnValue(chain); }
  );
  chain['update'] = vi.fn().mockReturnValue(chain);
  chain['insert'] = vi.fn().mockResolvedValue({ data: null, error: null });
  chain['single'] = vi.fn().mockImplementation(() => {
    const result = results[callIndex] ?? results[results.length - 1];
    callIndex++;
    return Promise.resolve(result);
  });
  return chain;
}

async function makeSupabase({
  user,
  adminUser,
  venueResult = { data: MOCK_VENUE, error: null },
  updateResult = { data: null, error: null },
}: {
  user: typeof MOCK_USER | null;
  adminUser: typeof MOCK_ADMIN | null;
  venueResult?: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
}) {
  const { createClient } = await import('@/lib/supabase/server');
  const chain = makeChain([
    { data: adminUser, error: adminUser ? null : { message: 'Not found' } },
    venueResult,
    updateResult,
  ]);
  // Make update() resolve the updateResult (not use the chain single)
  chain['update'] = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue(updateResult),
  });

  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockReturnValue(chain),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/venues/[id]/status — status validation', () => {
  let PATCH: (
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('@/app/api/venues/[id]/status/route');
    PATCH = mod.PATCH;
  });

  it('returns 401 when there is no authenticated user', async () => {
    await makeSupabase({ user: null, adminUser: null });
    const res = await PATCH(
      makePatchRequest({ status: 'approved' }),
      { params: Promise.resolve({ id: 'venue-abc' }) }
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 when authenticated user is not an admin', async () => {
    await makeSupabase({ user: MOCK_USER, adminUser: null });
    const res = await PATCH(
      makePatchRequest({ status: 'approved' }),
      { params: Promise.resolve({ id: 'venue-abc' }) }
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid status string', async () => {
    await makeSupabase({ user: MOCK_USER, adminUser: MOCK_ADMIN });
    const res = await PATCH(
      makePatchRequest({ status: 'hacked' }),
      { params: Promise.resolve({ id: 'venue-abc' }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid status value/i);
  });

  it('returns 400 for an empty string status', async () => {
    await makeSupabase({ user: MOCK_USER, adminUser: MOCK_ADMIN });
    const res = await PATCH(
      makePatchRequest({ status: '' }),
      { params: Promise.resolve({ id: 'venue-abc' }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid status value/i);
  });

  it('returns 400 for a numeric status', async () => {
    await makeSupabase({ user: MOCK_USER, adminUser: MOCK_ADMIN });
    const res = await PATCH(
      makePatchRequest({ status: 42 }),
      { params: Promise.resolve({ id: 'venue-abc' }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid status value/i);
  });

  it('accepts all four valid status values without a 400', async () => {
    for (const status of ['draft', 'approved', 'published', 'archived']) {
      vi.resetModules();
      const mod = await import('@/app/api/venues/[id]/status/route');
      PATCH = mod.PATCH;
      await makeSupabase({ user: MOCK_USER, adminUser: MOCK_ADMIN });

      const res = await PATCH(
        makePatchRequest({ status }),
        { params: Promise.resolve({ id: 'venue-abc' }) }
      );
      // May succeed (200) or fail for other reasons (404 venue not found in mock),
      // but must NOT be 400 "Invalid status value"
      const body = await res.json();
      expect(body.error ?? '').not.toMatch(/invalid status value/i);
    }
  });
});
