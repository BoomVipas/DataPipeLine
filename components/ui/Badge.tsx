import type { VenueStatus } from '@/types/venue';

const STATUS_STYLES: Record<VenueStatus, string> = {
  draft:     'bg-white/[0.07] text-dim',
  approved:  'bg-blue-400/10 text-blue-400',
  published: 'bg-emerald-400/10 text-emerald-400',
  archived:  'bg-white/[0.04] text-ghost',
};

const STATUS_LABELS: Record<VenueStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  published: 'Published',
  archived: 'Archived',
};

// Keyed by `key` field from the mobile app's `category` table
const CATEGORY_STYLES: Record<string, string> = {
  fitness:   'bg-orange-400/10 text-orange-400',
  wellness:  'bg-teal-400/10 text-teal-400',
  casual:    'bg-violet-400/10 text-violet-400',
  nightlife: 'bg-pink-400/10 text-pink-400',
};

interface BadgeProps {
  variant?: 'status' | 'category' | 'neutral';
  status?: VenueStatus;
  categoryKey?: string;
  categoryName?: string;
  label?: string;
  className?: string;
}

export default function Badge({ variant = 'neutral', status, categoryKey, categoryName, label, className = '' }: BadgeProps) {
  let text = label ?? '';
  let style = 'bg-white/[0.07] text-dim';

  if (variant === 'status' && status) {
    text = STATUS_LABELS[status];
    style = STATUS_STYLES[status];
  } else if (variant === 'category' && categoryKey) {
    text = categoryName ?? categoryKey;
    style = CATEGORY_STYLES[categoryKey] ?? 'bg-white/[0.07] text-dim';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style} ${className}`}>
      {text}
    </span>
  );
}
