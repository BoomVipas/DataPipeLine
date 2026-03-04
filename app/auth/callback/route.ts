import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Check the signed-in user is a registered admin
  const { data: { user } } = await supabase.auth.getUser();
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', user?.email)
    .single();

  if (!adminUser) {
    await supabase.auth.signOut();
    // Redirect to login with not_admin error, copying sign-out cookies
    const rejectedResponse = NextResponse.redirect(`${origin}/login?error=not_admin`);
    successResponse.cookies.getAll().forEach(({ name, value, ...options }) =>
      rejectedResponse.cookies.set(name, value, options)
    );
    return rejectedResponse;
  }

  return successResponse;
}
