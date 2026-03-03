import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const [{ data: venues }, { data: recentNotes }] = await Promise.all([
    supabase
      .from('venues')
      .select('status, category:category(key)')
      .eq('is_deleted', false),
    supabase
      .from('venue_notes')
      .select('*,venue:venues(name), author:admin_users(display_name)')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const statusCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  (venues as unknown as { status: string; category: { key: string } | null }[] ?? []).forEach(v => {
    statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
    if (v.category?.key) {
      categoryCounts[v.category.key] = (categoryCounts[v.category.key] || 0) + 1;
    }
  });

  return NextResponse.json({
    statusCounts,
    categoryCounts,
    recentActivity: recentNotes ?? [],
    total: venues?.length ?? 0,
  });
}
