/**
 * Tests for:
 *   Fix 3 — Slug unique constraint returns 409 (not 500)
 *   Fix 4 — Pagination page is capped at 1000
 *   Fix 6 — Duplicate google_place_id returns 409
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/utils/slug', () => ({
  generateSlug: vi.fn().mockReturnValue('test-venue'),
  makeUniqueSlug: vi.fn().mockReturnValue('test-venue'),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_USER  = { id: 'user-123' };
const MOCK_ADMIN = { id: 'admin-456', display_name: 'Admin' };

/** Creates a chainable Supabase query mock */
function makeQueryChain(terminalResult: unknown) {
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'like', 'ilike', 'order', 'range'].forEach(
    m => { chain[m] = vi.fn().mockReturnValue(chain); }
  );
  // Resolve at the end of the chain (.single() or direct await)
  chain['single'] = vi.fn().mockResolvedValue(terminalResult);
  chain['maybeSingle'] = vi.fn().mockResolvedValue(terminalResult);
  // Allow direct awaiting (e.g. `await query` without .single())
  chain['then'] = (resolve: (v: unknown) => void) => Promise.resolve(terminalResult).then(resolve);
  return chain;
}

function makeRequest(method: string, path: string, body?: Record<string, unknown>) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

// ── Fix 3: Slug unique constraint → 409 ──────────────────────────────────────

describe('POST /api/venues — slug conflict returns 409', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('@/app/api/venues/route');
    POST = mod.POST;
  });

  async function setupSupabase({
    insertError,
  }: {
    insertError: { code: string; message: string } | null;
  }) {
    const { createClient } = await import('@/lib/supabase/server');

    // Reusable chain for table queries
    const existingSlugChain = makeQueryChain({ data: [], error: null });
    const adminChain = makeQueryChain({ data: MOCK_ADMIN, error: null });
    const insertChain: Record<string, unknown> = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: insertError }),
        }),
      }),
    };
    const notesChain: Record<string, unknown> = {
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: MOCK_USER }, error: null }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'admin_users') return adminChain;
        if (table === 'venue_notes') return notesChain;
        if (table === 'venues') {
          return {
            ...existingSlugChain,
            ...insertChain,
          };
        }
        return makeQueryChain({ data: null, error: null });
      }),
    });
  }

  it('returns 409 when the slug unique constraint is violated (code 23505)', async () => {
    await setupSupabase({ insertError: { code: '23505', message: 'duplicate key value' } });
    const res = await POST(makeRequest('POST', '/api/venues', { name: 'Test Venue', status: 'draft' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already exists/i);
  });

  it('returns 500 for other database errors (not 23505)', async () => {
    await setupSupabase({ insertError: { code: '42P01', message: 'table not found' } });
    const res = await POST(makeRequest('POST', '/api/venues', { name: 'Test Venue', status: 'draft' }));
    expect(res.status).toBe(500);
  });

  it('returns 201 when there is no error', async () => {
    await setupSupabase({ insertError: null });
    // When insertError is null, data will be null too — the route tries to log a note
    // so set up a complete happy-path mock
    const { createClient } = await import('@/lib/supabase/server');
    const venueData = { id: 'v1', name: 'Test Venue', status: 'draft' };
    const notesChain = { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    const adminChain = makeQueryChain({ data: MOCK_ADMIN, error: null });
    const slugChain   = makeQueryChain({ data: [], error: null });

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: MOCK_USER } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'admin_users') return adminChain;
        if (table === 'venue_notes') return notesChain;
        return {
          ...slugChain,
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: venueData, error: null }),
            }),
          }),
        };
      }),
    });

    const res = await POST(makeRequest('POST', '/api/venues', { name: 'Test Venue', status: 'draft' }));
    expect(res.status).toBe(201);
  });

  it('returns 409 when google_place_id already exists', async () => {
    const { createClient } = await import('@/lib/supabase/server');

    const adminChain = makeQueryChain({ data: MOCK_ADMIN, error: null });
    const duplicateLookup: Record<string, unknown> = {};
    duplicateLookup['select'] = vi.fn().mockReturnValue(duplicateLookup);
    duplicateLookup['eq'] = vi.fn().mockReturnValue(duplicateLookup);
    duplicateLookup['maybeSingle'] = vi.fn().mockResolvedValue({
      data: { id: 'existing-1', name: 'Existing Venue', status: 'draft' },
      error: null,
    });

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: MOCK_USER } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'admin_users') return adminChain;
        if (table === 'venues') return duplicateLookup;
        return makeQueryChain({ data: null, error: null });
      }),
    });

    const res = await POST(makeRequest('POST', '/api/venues', {
      name: 'Test Venue',
      status: 'draft',
      google_place_id: 'place-123',
    }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('duplicate');
    expect(body.existing).toMatchObject({
      id: 'existing-1',
      name: 'Existing Venue',
      status: 'draft',
    });
  });
});

// ── Fix 4: Pagination cap at 1000 ────────────────────────────────────────────

describe('GET /api/venues — pagination cap', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('@/app/api/venues/route');
    GET = mod.GET;
  });

  async function setupGetSupabase(rangeSpy: ReturnType<typeof vi.fn>) {
    const { createClient } = await import('@/lib/supabase/server');

    const chain: Record<string, unknown> = {};
    ['eq', 'order', 'ilike'].forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
    chain['select'] = vi.fn().mockReturnValue(chain);
    chain['range'] = rangeSpy.mockReturnValue(
      Promise.resolve({ data: [], count: 0, error: null })
    );

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: MOCK_USER } }) },
      from: vi.fn().mockReturnValue(chain),
    });
  }

  it('caps page at 1000 when a huge page number is supplied', async () => {
    const rangeSpy = vi.fn();
    await setupGetSupabase(rangeSpy);

    const res = await GET(makeRequest('GET', '/api/venues?page=9999999'));
    expect(res.status).toBe(200);

    // page=1000 → from = (1000-1)*20 = 19980, to = 19999
    expect(rangeSpy).toHaveBeenCalledWith(19980, 19999);
  });

  it('page=1 produces the correct first-page range', async () => {
    const rangeSpy = vi.fn();
    await setupGetSupabase(rangeSpy);

    await GET(makeRequest('GET', '/api/venues?page=1'));
    expect(rangeSpy).toHaveBeenCalledWith(0, 19);
  });

  it('clamps negative page numbers to 1', async () => {
    const rangeSpy = vi.fn();
    await setupGetSupabase(rangeSpy);

    await GET(makeRequest('GET', '/api/venues?page=-5'));
    expect(rangeSpy).toHaveBeenCalledWith(0, 19);
  });

  it('page=1000 (exactly at cap) produces the correct range', async () => {
    const rangeSpy = vi.fn();
    await setupGetSupabase(rangeSpy);

    await GET(makeRequest('GET', '/api/venues?page=1000'));
    expect(rangeSpy).toHaveBeenCalledWith(19980, 19999);
  });
});
