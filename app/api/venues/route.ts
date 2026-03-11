import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSlug, makeUniqueSlug } from '@/lib/utils/slug';

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;

  const status = searchParams.get('status');
  const categoryId = searchParams.get('category_id');
  const subCategory = searchParams.get('sub_category');
  const q = searchParams.get('q');
  const page = Math.min(Math.max(1, Number(searchParams.get('page') ?? 1)), 1000);
  const pageSize = 20;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('venues')
    .select('*', { count: 'exact' })
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (status && status !== 'all') query = query.eq('status', status);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (subCategory) query = query.eq('sub_category', subCategory);
  if (q) query = query.ilike('name', `%${q}%`);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ venues: data, count, page, pageSize });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get admin user record
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { admin_note, ...venueData } = body;

  // Generate unique slug
  const desiredSlug = generateSlug(venueData.name);
  const { data: existingSlugs } = await supabase
    .from('venues')
    .select('slug')
    .like('slug', `${desiredSlug}%`)
    .eq('is_deleted', false);

  const slugList = (existingSlugs ?? []).map((r: { slug: string }) => r.slug).filter(Boolean);
  const slug = makeUniqueSlug(desiredSlug, slugList);

  // Handle approval/publish audit fields
  const now = new Date().toISOString();
  const extra: Record<string, unknown> = {};
  if (venueData.status === 'approved' || venueData.status === 'published') {
    extra.approved_by = adminUser.id;
    extra.approved_at = now;
  }
  if (venueData.status === 'published') {
    extra.published_by = adminUser.id;
    extra.published_at = now;
  }

  const { data: venue, error } = await supabase
    .from('venues')
    .insert({
      ...venueData,
      ...extra,
      slug,
      created_by: adminUser.id,
      updated_by: adminUser.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A venue with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log creation note
  const noteContent = `Created venue with status: ${venueData.status ?? 'draft'}`;
  await supabase.from('venue_notes').insert({
    venue_id: venue.id,
    author_id: adminUser.id,
    note_type: 'status_change',
    content: noteContent,
    metadata: { status: venueData.status ?? 'draft' },
  });

  // Add admin note if provided
  if (admin_note?.trim()) {
    await supabase.from('venue_notes').insert({
      venue_id: venue.id,
      author_id: adminUser.id,
      note_type: 'comment',
      content: admin_note.trim(),
    });
  }

  return NextResponse.json({ venue }, { status: 201 });
}
