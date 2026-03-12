import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Category, CategoryChild } from '@/types/venue';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: adminUser } = await supabase
    .from('admin_users').select('id').eq('user_id', user.id).single();
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch all level-1 and level-2 categories in one query
  const { data, error } = await supabase
    .from('category')
    .select('id, name, key, icon_key, parent_id, level, sort_order')
    .in('level', [1, 2])
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const level1 = rows.filter(r => r.level === 1);
  const level2 = rows.filter(r => r.level === 2);

  const categories: Category[] = level1.map(cat => ({
    id: cat.id,
    name: cat.name,
    key: cat.key,
    icon_key: cat.icon_key,
    sub_categories: level2
      .filter((sub): sub is typeof sub & { parent_id: string } => sub.parent_id === cat.id)
      .map((sub): CategoryChild => ({ id: sub.id, key: sub.key, name: sub.name })),
  }));

  return NextResponse.json({ categories });
}
