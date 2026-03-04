import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name') ?? '';
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');

  if (!name && isNaN(lat)) {
    return NextResponse.json({ duplicates: [] });
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Name fuzzy match (case-insensitive)
  let query = supabase
    .from('venues')
    .select('id, name, district, status, lat, lng')
    .eq('is_deleted', false)
    .ilike('name', `%${name}%`)
    .limit(5);

  const { data: byName } = await query;

  // Proximity match (within ~100m using bounding box approximation)
  let byLocation: typeof byName = [];
  if (!isNaN(lat) && !isNaN(lng)) {
    const delta = 0.001; // ~111m at Bangkok latitude
    const { data } = await supabase
      .from('venues')
      .select('id, name, district, status, lat, lng')
      .eq('is_deleted', false)
      .gte('lat', lat - delta)
      .lte('lat', lat + delta)
      .gte('lng', lng - delta)
      .lte('lng', lng + delta)
      .limit(5);
    byLocation = data ?? [];
  }

  // Merge and deduplicate
  const seen = new Set<string>();
  const duplicates = [...(byName ?? []), ...byLocation].filter(v => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });

  return NextResponse.json({ duplicates });
}
