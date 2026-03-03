import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: adminUser } = await supabase
    .from('admin_users').select('id').eq('user_id', user.id).single();
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const venueId = formData.get('venue_id') as string | null;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const allowed = ['jpg', 'jpeg', 'png', 'webp'];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: 'Only JPG, PNG, WEBP files allowed' }, { status: 400 });
  }

  const fileName = `${venueId ?? 'temp'}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from('venue-photos')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from('venue-photos')
    .getPublicUrl(fileName);

  return NextResponse.json({ url: publicUrl });
}
