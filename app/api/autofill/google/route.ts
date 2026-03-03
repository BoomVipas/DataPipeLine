import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchVenueWithGemini } from '@/lib/autofill/gemini';

// This endpoint now uses Gemini with Google Search grounding instead of Google Places API
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const data = await searchVenueWithGemini(name, 'name');
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true, data });
}
