import type { Venue } from '@/types/venue';

// Rotating pill colors for feature badges
const PILL_COLORS = [
  'bg-orange-100 text-orange-800',
  'bg-green-100 text-green-800',
  'bg-red-100 text-red-800',
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
];

// Feature icons (simple emoji fallback — matches app's icon categories)
const FEATURE_ICONS: Record<string, string> = {
  'Gear Included': '🎒',
  'All Levels': '📊',
  'Group Friendly': '👥',
  'Beginner Friendly': '🌱',
  'Advanced': '🏆',
  'Expert Only': '⚡',
  'Kids Welcome': '🧒',
  'Pet Friendly': '🐾',
  'Outdoor Area': '🌿',
  'Air Conditioned': '❄️',
  'Private Sessions': '🔒',
  'Class Schedule': '📅',
  'Drop-in Welcome': '🚪',
  'Members Only': '🎫',
  'Open 24/7': '🕐',
  'Rooftop': '🏙️',
  'Pool': '🏊',
  'Sauna': '🧖',
  'Steam Room': '💨',
  'Live Music': '🎵',
  'DJ': '🎧',
  'Happy Hour': '🍹',
  'Food Available': '🍽️',
  'BYOB': '🍾',
};

function getTodayClose(venue: Venue): string | null {
  if (!venue.opening_hours) return null;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const today = days[new Date().getDay()];
  const slots = venue.opening_hours[today] ?? [];
  if (slots.length === 0) return 'Closed today';
  const close = slots[slots.length - 1].close;
  const [h, m] = close.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `Open until ${hour12}${m > 0 ? `:${m.toString().padStart(2, '0')}` : ''} ${period}`;
}

// ============================================================
// Required-fields checklist shown above the phone preview
// ============================================================
interface CheckItem {
  label: string;
  ok: boolean;
  note?: string;
}

function ApprovalChecklist({ venue }: { venue: Venue }) {
  const checks: CheckItem[] = [
    { label: 'Hero image', ok: !!venue.hero_image_url },
    { label: 'Short description', ok: !!venue.short_description, note: 'Shown in app cards' },
    { label: 'Category', ok: !!venue.category_id },
    { label: 'Features (1+)', ok: (venue.features?.length ?? 0) > 0, note: 'App feature badges' },
    { label: 'Opening hours', ok: !!venue.opening_hours },
    { label: 'Price info', ok: !!(venue.price_level || venue.price_thb) },
    { label: 'Address / Location', ok: !!(venue.address || (venue.lat && venue.lng)) },
    { label: 'Contact (phone / web)', ok: !!(venue.phone || venue.website_url) },
  ];

  const missing = checks.filter(c => !c.ok).length;
  const allGood = missing === 0;

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${allGood ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">
          {allGood ? '✅ Ready to approve' : `⚠️ ${missing} field${missing > 1 ? 's' : ''} missing`}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-2">
            <span className={`text-sm ${c.ok ? 'text-green-600' : 'text-amber-600'}`}>
              {c.ok ? '✓' : '✗'}
            </span>
            <span className={`text-xs ${c.ok ? 'text-gray-600' : 'text-amber-700 font-medium'}`}>
              {c.label}
            </span>
            {c.note && !c.ok && (
              <span className="text-[10px] text-gray-400">— {c.note}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Phone mockup preview
// ============================================================
export default function VenueMobilePreview({ venue }: { venue: Venue }) {
  const todayHours = getTodayClose(venue);
  const allPhotos = [venue.hero_image_url, ...(venue.photo_urls ?? [])].filter(Boolean) as string[];
  const priceText = venue.price_thb
    ? `฿${venue.price_thb.toLocaleString()}`
    : venue.price_level
    ? ['฿', '฿฿', '฿฿฿', '฿฿฿฿'][venue.price_level - 1]
    : null;

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">App Preview</p>

      <ApprovalChecklist venue={venue} />

      {/* Phone frame */}
      <div className="mx-auto w-[280px] rounded-[36px] border-[6px] border-gray-800 bg-gray-800 shadow-2xl overflow-hidden">
        {/* Status bar */}
        <div className="bg-gray-800 px-5 py-1.5 flex justify-between items-center">
          <span className="text-white text-[10px] font-medium">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M1.5 8.5a13 13 0 0121 0M5 12a10 10 0 0114 0M8.5 15.5a6 6 0 017 0M12 19h.01" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
            <svg className="w-3.5 h-2 text-white" viewBox="0 0 24 12" fill="currentColor">
              <rect x="0" y="0" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="1.5" y="1.5" width="13" height="9" rx="1" fill="currentColor"/>
              <rect x="19" y="3" width="4" height="6" rx="1"/>
            </svg>
          </div>
        </div>

        {/* Scrollable app content */}
        <div className="bg-[#F5EFE4] overflow-y-auto max-h-[580px]" style={{ scrollbarWidth: 'none' }}>

          {/* Hero image */}
          <div className="relative h-44 bg-gray-300">
            {venue.hero_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={venue.hero_image_url} alt={venue.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex flex-col items-center justify-center gap-1">
                <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5M4.5 3v18m15-18v18" />
                </svg>
                <span className="text-gray-500 text-[10px]">No hero image</span>
              </div>
            )}

            {/* Top nav */}
            <div className="absolute top-2.5 left-0 right-0 flex justify-between px-3">
              <div className="w-6 h-6 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <div className="flex gap-1.5">
                <div className="w-6 h-6 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div className="w-6 h-6 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* "See photos" pill */}
            {allPhotos.length > 1 && (
              <div className="absolute top-2.5 right-12 bg-black/40 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded-full">
                📷 See photos
              </div>
            )}

            {/* Bottom stats overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-2.5">
              <div className="flex items-end justify-between">
                <div className="flex gap-4">
                  {venue.rating && (
                    <div>
                      <div className="text-yellow-400 text-[11px] font-bold leading-tight">
                        ⭐ {venue.rating}
                        <span className="text-white/70 font-normal ml-0.5">({venue.rating_count ?? 0})</span>
                      </div>
                      <div className="text-white/60 text-[8px]">Rating</div>
                    </div>
                  )}
                  {priceText && (
                    <div>
                      <div className="text-white text-[11px] font-bold leading-tight">{priceText}</div>
                      <div className="text-white/60 text-[8px]">Price</div>
                    </div>
                  )}
                </div>
                {todayHours && (
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-medium ${todayHours.startsWith('Closed') ? 'bg-red-500/80 text-white' : 'bg-green-500/80 text-white'}`}>
                    {todayHours}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-3.5 pt-3.5 pb-5 space-y-3.5">

            {/* Venue name */}
            <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
              {venue.name || <span className="text-gray-400 italic">Venue name</span>}
            </h3>

            {/* Feature pill badges */}
            {(venue.features?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(venue.features ?? []).slice(0, 3).map((f, i) => (
                  <span
                    key={f}
                    className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${PILL_COLORS[i % PILL_COLORS.length]}`}
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}

            {/* About */}
            {venue.short_description && (
              <div>
                <h4 className="text-[11px] font-bold text-gray-900 mb-1">About</h4>
                <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-3">
                  {venue.short_description}
                </p>
                <span className="text-[10px] text-amber-600 font-medium">Read more</span>
              </div>
            )}

            {/* Feature icons grid */}
            {(venue.features?.length ?? 0) > 0 && (
              <div className={`grid gap-2 py-1 ${(venue.features?.length ?? 0) >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {(venue.features ?? []).slice(0, 3).map(f => (
                  <div key={f} className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-base">
                      {FEATURE_ICONS[f] ?? '🏷'}
                    </div>
                    <span className="text-[7px] text-gray-600 text-center uppercase tracking-wide leading-tight font-medium">
                      {f}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Likeness by Community (placeholder) */}
            <div className="bg-white rounded-xl p-2.5 space-y-1.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  <span className="text-[9px] font-semibold text-gray-700">Likeness By Community</span>
                </div>
                <span className="text-[9px] text-amber-600 font-medium">Like it!</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" />
              </div>
              <div className="flex justify-between">
                <span className="text-[8px] text-gray-400">Dislike</span>
                <span className="text-[8px] text-gray-400">Love it!</span>
              </div>
            </div>

            {/* Community Opinion (placeholder) */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-[11px] font-bold text-gray-900">Community Opinion</h4>
                <span className="text-sm">🏆</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['Top Rated', 'Beginner Friendly', 'Highly Rec\'d'].map(opinion => (
                  <div key={opinion} className="flex flex-col items-center gap-1 bg-[#1a2444] rounded-xl p-2">
                    <span className="text-base">⭐</span>
                    <span className="text-[7px] text-white text-center uppercase tracking-wide leading-tight font-medium">{opinion}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo strip */}
            {allPhotos.length > 1 && (
              <div className="space-y-1.5">
                <div className="flex gap-1.5 overflow-hidden">
                  {allPhotos.slice(1, 4).map((url, i) => (
                    <div key={i} className="w-[78px] h-[60px] rounded-xl overflow-hidden shrink-0 bg-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Host event CTA (placeholder) */}
            <div className="text-center py-2 space-y-0.5">
              <div className="text-sm">📣</div>
              <p className="text-[10px] font-bold text-gray-800">Host a Community Event</p>
              <p className="text-[8px] text-gray-500">Organize a meetup here. We'll pre-fill the details.</p>
              <button className="mt-1.5 w-full py-2 border border-amber-500 text-amber-600 text-[9px] font-semibold rounded-xl">
                ⊕ Host Event Here
              </button>
            </div>

            {/* CTA buttons */}
            <div className="space-y-2 pt-1">
              <button className="w-full py-2.5 bg-[#1a2444] text-white text-[10px] font-bold rounded-xl tracking-wide">
                🧭 Navigate to
              </button>
              <button className="w-full py-2.5 bg-[#C9A84C] text-white text-[10px] font-bold rounded-xl tracking-wide">
                Book Now →
              </button>
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="bg-gray-800 flex justify-center py-1.5">
          <div className="w-16 h-1 bg-white/40 rounded-full" />
        </div>
      </div>
    </div>
  );
}
