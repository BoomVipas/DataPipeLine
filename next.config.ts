import type { NextConfig } from 'next';

const securityHeaders = [
  // Prevent this admin tool from being embedded in iframes (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Control referrer info sent with requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features not used by the admin
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Enable XSS filter in older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
];

const nextConfig: NextConfig = {
  // Expose EXPO_PUBLIC_ vars to the browser bundle
  // (Next.js only auto-exposes NEXT_PUBLIC_ — we declare the Expo ones explicitly)
  env: {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    EXPO_PUBLIC_SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
