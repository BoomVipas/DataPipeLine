import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scrapeWebsite } from '@/lib/autofill/website';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  const data = await scrapeWebsite(url);
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Could not scrape website' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data });
}
