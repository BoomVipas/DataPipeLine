import type { VenueStatus } from '@/types/venue';

const STATUS_STYLES: Record<VenueStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-50 text-blue-700',
  published: 'bg-green-50 text-green-700',
  archived: 'bg-gray-100 text-gray-400',
};

const STATUS_LABELS: Record<VenueStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  published: 'Published',
  archived: 'Archived',
};

// Keyed by `key` field from the mobile app's `category` table
const CATEGORY_STYLES: Record<string, string> = {
  fitness:   'bg-orange-50 text-orange-700',
  wellness:  'bg-teal-50 text-teal-700',
  casual:    'bg-purple-50 text-purple-700',
  nightlife: 'bg-indigo-50 text-indigo-700',
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
  let style = 'bg-gray-100 text-gray-600';

  if (variant === 'status' && status) {
    text = STATUS_LABELS[status];
    style = STATUS_STYLES[status];
  } else if (variant === 'category' && categoryKey) {
    text = categoryName ?? categoryKey;
    style = CATEGORY_STYLES[categoryKey] ?? 'bg-gray-100 text-gray-600';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style} ${className}`}>
      {text}
    </span>
  );
}
