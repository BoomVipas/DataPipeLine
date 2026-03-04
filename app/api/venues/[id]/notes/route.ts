import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('venue_notes')
    .select('*, author:admin_users(display_name, email)')
    .eq('venue_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notes: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('venue_notes')
    .insert({
      venue_id: id,
      author_id: adminUser.id,
      note_type: 'comment',
      content: content.trim(),
    })
    .select('*, author:admin_users(display_name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ note: data }, { status: 201 });
}
