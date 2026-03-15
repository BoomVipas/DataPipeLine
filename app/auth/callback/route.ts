import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Create the redirect response first so Supabase can write session
  // cookies directly onto it — using NextResponse.redirect() separately
  // would create a different response object and lose the cookies.
  const successResponse = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            successResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  console.log('[auth/callback] exchanging code...');
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  console.log('[auth/callback] exchange result:', { error: error?.message ?? null });

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Check the signed-in user is a registered admin
  const { data: { user } } = await supabase.auth.getUser();
  console.log('[auth/callback] user authenticated:', !!user);

  // Use service role to bypass RLS — new admins have user_id=null so
  // a policy checking auth.uid()=user_id would hide their row entirely.
  const serviceClient = createServiceClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'api' } }
  );

  const { data: adminUser, error: adminError } = await serviceClient
    .from('admin_users')
    .select('id, user_id')
    .eq('email', user?.email)
    .single();
  console.log('[auth/callback] admin lookup:', { found: !!adminUser, error: adminError?.message ?? null });

  if (!adminUser) {
    await supabase.auth.signOut();
    const rejectedResponse = NextResponse.redirect(`${origin}/login?error=not_admin`);
    successResponse.cookies.getAll().forEach(({ name, value, ...options }) =>
      rejectedResponse.cookies.set(name, value, options)
    );
    return rejectedResponse;
  }

  // Populate user_id on first login (rows added via SQL INSERT have null user_id)
  if (user && !(adminUser as { user_id?: string }).user_id) {
    await serviceClient
      .from('admin_users')
      .update({ user_id: user.id })
      .eq('id', adminUser.id);
    console.log('[auth/callback] populated user_id for new admin');
  }

  console.log('[auth/callback] admin verified, redirecting to', next);
  return successResponse;
}
