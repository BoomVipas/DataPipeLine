import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
  }

  return NextResponse.json({ venue: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, display_name')
    .eq('user_id', user.id)
    .single();
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { admin_note, ...updateData } = body;

  // Get current venue to detect changed fields
  const { data: current } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .single();

  if (!current) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

  // Detect which fields changed for the activity log
  const changedFields = Object.keys(updateData).filter(
    key => JSON.stringify(updateData[key]) !== JSON.stringify(current[key])
  );

  const { data: venue, error } = await supabase
    .from('venues')
    .update({ ...updateData, updated_by: adminUser.id })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log edit
  if (changedFields.length > 0) {
    await supabase.from('venue_notes').insert({
      venue_id: id,
      author_id: adminUser.id,
      note_type: 'edit_log',
      content: `${adminUser.display_name} edited: ${changedFields.join(', ')}`,
      metadata: { changed_fields: changedFields },
    });
  }

  // Add admin note
  if (admin_note?.trim()) {
    await supabase.from('venue_notes').insert({
      venue_id: id,
      author_id: adminUser.id,
      note_type: 'comment',
      content: admin_note.trim(),
    });
  }

  return NextResponse.json({ venue });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, display_name')
    .eq('user_id', user.id)
    .single();
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: currentVenue } = await supabase
    .from('venues')
    .select('id, activity_id, google_place_id')
    .eq('id', id)
    .single();

  if (!currentVenue) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

  // Soft-delete and archive in admin table.
  const { error } = await supabase
    .from('venues')
    .update({
      is_deleted: true,
      status: 'archived',
      deleted_at: new Date().toISOString(),
      updated_by: adminUser.id,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Activity doesn't have a confirmed is_deleted column in this project;
  // hide the linked activity by toggling is_verified instead of hard-deleting.
  if (currentVenue.activity_id) {
    await supabase
      .from('activity')
      .update({ is_verified: false })
      .eq('id', currentVenue.activity_id);
  } else if (currentVenue.google_place_id) {
    await supabase
      .from('activity')
      .update({ is_verified: false })
      .eq('google_place_id', currentVenue.google_place_id);
  }

  await supabase.from('venue_notes').insert({
    venue_id: id,
    author_id: adminUser.id,
    note_type: 'status_change',
    content: `${adminUser.display_name} archived and deleted this venue.`,
  });

  return NextResponse.json({ success: true });
}
