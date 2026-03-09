import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import EditVenueClient from '@/components/venues/EditVenueClient';
import type { Venue } from '@/types/venue';

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!adminUser) redirect('/login');

  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (!venue) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/venues/${id}`}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">
          Edit: {venue.name}
        </h1>
      </div>

      <EditVenueClient
        venue={venue as Venue}
        venueId={id}
        adminUserId={adminUser.id}
      />
    </div>
  );
}
