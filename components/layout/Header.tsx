'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AdminUser } from '@/types/venue';

interface HeaderProps {
  adminUser: AdminUser | null;
}

export default function Header({ adminUser }: HeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-end px-6 shrink-0">
      <div className="flex items-center gap-3">
        {adminUser && (
          <span className="text-sm text-gray-600">
            {adminUser.display_name}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
