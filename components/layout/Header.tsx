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

  const initials = adminUser?.display_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <header className="h-14 border-b border-white/[0.07] bg-panel flex items-center justify-end px-6 shrink-0">
      <div className="flex items-center gap-4">
        {adminUser && (
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-flame/[0.15] border border-flame/30 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-flame font-display">{initials}</span>
              </div>
              <span className="text-sm text-dim font-medium">{adminUser.display_name}</span>
            </div>
            <div className="w-px h-4 bg-white/[0.1]" />
          </>
        )}
        <button
          onClick={handleSignOut}
          className="text-xs text-ghost hover:text-ink transition-colors tracking-widest uppercase font-medium"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
