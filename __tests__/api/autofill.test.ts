/**
 * Tests for Fix 1: missing admin check on autofill sub-routes.
 * Both /api/autofill/google and /api/autofill/website must reject
 * non-admin authenticated users with 401.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/autofill/website', () => ({
  scrapeWebsite: vi.fn().mockResolvedValue({ name: 'Test Venue' }),
}));
vi.mock('@/lib/autofill/gemini', () => ({
  searchVenueWithGemini: vi.fn().mockResolvedValue({ name: 'Test Venue' }),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_USER = { id: 'user-123', email: 'test@example.com' };
const MOCK_ADMIN = { id: 'admin-456' };

function makeChain(singleResult: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'order', 'limit', 'range'].forEach(
    m => { chain[m] = vi.fn().mockReturnValue(chain); }
  );
  chain['single'] = vi.fn().mockResolvedValue(singleResult);
  return chain;
}

async function makeSupabase({
  user,
  adminUser,
}: {
  user: typeof MOCK_USER | null;
  adminUser: typeof MOCK_ADMIN | null;
}) {
  const { createClient } = await import('@/lib/supabase/server');
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockReturnValue(
      makeChain({ data: adminUser, error: adminUser ? null : { message: 'Not found' } })
    ),
  });
}

function makePostRequest(body: Record<string, unknown>, path: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── /api/autofill/website ────────────────────────────────────────────────────

describe('POST /api/autofill/website', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    // Re-import fresh so mock state is clean
    const mod = await import('@/app/api/autofill/website/route');
    POST = mod.POST;
  });

  it('returns 401 when there is no authenticated user', async () => {
    await makeSupabase({ user: null, adminUser: null });
    const res = await POST(makePostRequest({ url: 'https://example.com' }, '/api/autofill/website'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when authenticated user is not an admin', async () => {
    await makeSupabase({ user: MOCK_USER, adminUser: null });
    const res = await POST(makePostRequest({ url: 'https://example.com' }, '/api/autofill/website'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when no URL is provided (admin user)', async () => {
    await makeSupabase({ user: MOCK_USER, adminUser: MOCK_ADMIN });
    const res = await POST(makePostRequest({}, '/api/autofill/website'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/url required/i);
  });

  it('returns 200 with data when admin user provides a valid URL', async () => {
    await makeSupabase({ user: MOCK_USER, adminUser: MOCK_ADMIN });
    const res = await POST(makePostRequest({ url: 'https://example.com' }, '/api/autofill/website'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });
});

// ── /api/autofill/google ─────────────────────────────────────────────────────

describe('POST /api/autofill/google', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('@/app/api/autofill/google/route');
    POST = mod.POST;
  });

  it('returns 401 when there is no authenticated user', async () => {
    await makeSupabase({ user: null, adminUser: null });
    const res = await POST(makePostRequest({ name: 'Fitness Loft' }, '/api/autofill/google'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when authenticated user is not an admin', async () => {
    await makeSupabase({ user: MOCK_USER, adminUser: null });
    const res = await POST(makePostRequest({ name: 'Fitness Loft' }, '/api/autofill/google'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when no name is provided (admin user)', async () => {
    await makeSupabase({ user: MOCK_USER, adminUser: MOCK_ADMIN });
    const res = await POST(makePostRequest({}, '/api/autofill/google'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/name required/i);
  });

  it('returns 200 with data when admin user provides a venue name', async () => {
    await makeSupabase({ user: MOCK_USER, adminUser: MOCK_ADMIN });
    const res = await POST(makePostRequest({ name: 'Fitness Loft' }, '/api/autofill/google'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });
});
