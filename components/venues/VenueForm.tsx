'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HoursEditor from './HoursEditor';
import type {
  Venue, VenueSubCategory, VenueStatus,
  OperatingHours, BookingMethod, Category,
} from '@/types/venue';
import type { AutofillVenueData } from '@/types/autofill';
import { BANGKOK_DISTRICTS, COMMON_FEATURES, COMMON_FACILITIES } from '@/lib/utils/categories';

const EMPTY_HOURS: OperatingHours = {
  monday: [], tuesday: [], wednesday: [], thursday: [],
  friday: [], saturday: [], sunday: [],
};

const PRICE_LABELS: Record<number, string> = {
  1: '฿', 2: '฿฿', 3: '฿฿฿', 4: '฿฿฿฿',
};

const BOOKING_METHODS: { value: BookingMethod; label: string }[] = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'line', label: 'LINE' },
  { value: 'website', label: 'Website' },
  { value: 'wander', label: 'Wander' },
];

interface VenueFormProps {
  initial?: Partial<Venue> | AutofillVenueData;
  venueId?: string;
  descriptionIsAi?: boolean;
  mode: 'create' | 'edit';
  adminUserId: string;
}

export default function VenueForm({
  initial = {},
  venueId,
  descriptionIsAi = false,
  mode,
}: VenueFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Load categories from DB, then auto-select if autofill provided a suggestion
  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => {
        const cats: Category[] = d.categories ?? [];
        setCategories(cats);
        // Auto-select category from suggested_category_slug (e.g. "fitness")
        if (!categoryId && af.suggested_category_slug) {
          const match = cats.find(
            c => c.name.toLowerCase() === af.suggested_category_slug ||
                 c.key?.toLowerCase() === af.suggested_category_slug
          );
          if (match) setCategoryId(match.id);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const v = initial as Partial<Venue>;
  const af = initial as AutofillVenueData;

  // Basic info
  const [name, setName] = useState(v.name ?? '');
  const [categoryId, setCategoryId] = useState(v.category_id ?? '');
  const [subCategory, setSubCategory] = useState<VenueSubCategory | ''>(v.sub_category ?? '');

  // Feature arrays (prefer existing venue data, fall back to autofill)
  const [features, setFeatures] = useState<string[]>(v.features ?? af.features ?? []);
  const [featuresInput, setFeaturesInput] = useState('');
  const [facilities, setFacilities] = useState<string[]>(v.facilities ?? af.facilities ?? []);
  const [facilitiesInput, setFacilitiesInput] = useState('');

  // Location
  const [address, setAddress] = useState(v.address ?? af.address ?? '');
  const [lat, setLat] = useState<string>((v.lat ?? af.lat)?.toString() ?? '');
  const [lng, setLng] = useState<string>((v.lng ?? af.lng)?.toString() ?? '');
  const [district, setDistrict] = useState(v.district ?? af.district ?? '');
  const [nearestBts, setNearestBts] = useState(v.nearest_bts_mrt ?? af.nearest_bts_mrt ?? '');

  // Contact
  const [phone, setPhone] = useState(v.phone ?? af.phone ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(v.website_url ?? af.website_url ?? '');
  const [instagramUrl, setInstagramUrl] = useState(v.instagram_url ?? af.instagram_url ?? '');
  const [facebookUrl, setFacebookUrl] = useState(v.facebook_url ?? af.facebook_url ?? '');
  const [lineId, setLineId] = useState(v.line_id ?? af.line_id ?? '');
  const [bookingMethod, setBookingMethod] = useState<BookingMethod | ''>(v.booking_method ?? af.booking_method ?? '');
  const [bookingUrl, setBookingUrl] = useState(v.booking_url ?? af.booking_url ?? '');

  // Operating Info
  const [hours, setHours] = useState<OperatingHours>(v.opening_hours ?? af.opening_hours ?? EMPTY_HOURS);
  const [priceLevel, setPriceLevel] = useState<number | null>(v.price_level ?? af.price_level ?? null);
  const [priceThb, setPriceThb] = useState<string>(v.price_thb?.toString() ?? '');

  // Content
  const [shortDescription, setShortDescription] = useState(v.short_description ?? af.short_description ?? '');
  const [longDescription, setLongDescription] = useState(v.long_description ?? af.long_description ?? '');
  const [heroImageUrl, setHeroImageUrl] = useState(v.hero_image_url ?? af.hero_image_url ?? '');
  const [photoUrls] = useState<string[]>(v.photo_urls ?? af.photo_urls ?? []);
  const [adminNote, setAdminNote] = useState('');

  const [aiDraft] = useState(descriptionIsAi && !!shortDescription);

  const selectedCategory = categories.find(c => c.id === categoryId);

  function addChip(list: string[], setList: (v: string[]) => void, value: string) {
    const t = value.trim();
    if (t && !list.includes(t)) setList([...list, t]);
  }

  function removeChip(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.filter(x => x !== item));
  }

  async function submit(targetStatus: VenueStatus) {
    if (!name || !categoryId) {
      setError('Name and Category are required.');
      return;
    }
    setError(null);

    const body = {
      name,
      category_id: categoryId,
      sub_category: subCategory || null,
      features: features.length > 0 ? features : null,
      facilities: facilities.length > 0 ? facilities : null,
      address: address || null,
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      district: district || null,
      nearest_bts_mrt: nearestBts || null,
      phone: phone || null,
      website_url: websiteUrl || null,
      instagram_url: instagramUrl || null,
      facebook_url: facebookUrl || null,
      line_id: lineId || null,
      booking_method: bookingMethod || null,
      booking_url: bookingUrl || null,
      opening_hours: hours,
      price_level: priceLevel,
      price_thb: priceThb ? Number(priceThb) : null,
      short_description: shortDescription || null,
      long_description: longDescription || null,
      hero_image_url: heroImageUrl || null,
      photo_urls: photoUrls.length > 0 ? photoUrls : null,
      rating: (v as Partial<Venue>).rating ?? (af as AutofillVenueData).rating ?? null,
      rating_count: (v as Partial<Venue>).rating_count ?? (af as AutofillVenueData).rating_count ?? null,
      google_place_id: (v as Partial<Venue>).google_place_id ?? (af as AutofillVenueData).google_place_id ?? null,
      status: targetStatus,
      admin_note: adminNote || null,
    };

    startTransition(async () => {
      const url = mode === 'create' ? '/api/venues' : `/api/venues/${venueId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }

      const id = mode === 'create' ? data.venue?.id : venueId;
      router.push(`/venues/${id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={e => e.preventDefault()} className="space-y-8 max-w-3xl">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Section A: Basic Info */}
      <Section title="Basic Info">
        <Field label="Name" required>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className={inputClass}
            placeholder="Indoor Bouldering Bangkok"
          />
        </Field>

        <div className="flex gap-3">
          <Field label="Category" required>
            <select
              value={categoryId}
              onChange={e => { setCategoryId(e.target.value); setSubCategory(''); }}
              required
              className={inputClass}
            >
              <option value="">Select category...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Sub-category">
            <select
              value={subCategory}
              onChange={e => setSubCategory(e.target.value as VenueSubCategory | '')}
              disabled={!categoryId || !selectedCategory}
              className={inputClass + ' disabled:bg-gray-50 disabled:text-gray-400'}
            >
              <option value="">Select...</option>
              {selectedCategory?.sub_categories.map(sub => (
                <option key={sub.id} value={sub.key}>{sub.name}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Features */}
        <Field label="Features (shown as badges in app)">
          <ChipInput
            items={features}
            onAdd={v => addChip(features, setFeatures, v)}
            onRemove={item => removeChip(features, setFeatures, item)}
            inputValue={featuresInput}
            onInputChange={setFeaturesInput}
            suggestions={COMMON_FEATURES}
            placeholder="Gear Included, All Levels..."
          />
        </Field>

        {/* Facilities */}
        <Field label="Facilities">
          <ChipInput
            items={facilities}
            onAdd={v => addChip(facilities, setFacilities, v)}
            onRemove={item => removeChip(facilities, setFacilities, item)}
            inputValue={facilitiesInput}
            onInputChange={setFacilitiesInput}
            suggestions={COMMON_FACILITIES}
            placeholder="Parking, Locker Room..."
          />
        </Field>
      </Section>

      {/* Section B: Location */}
      <Section title="Location">
        <Field label="Address">
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} className={inputClass} placeholder="123 Sukhumvit Soi 55, Bangkok" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude">
            <input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} className={inputClass} placeholder="13.7340" />
          </Field>
          <Field label="Longitude">
            <input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} className={inputClass} placeholder="100.5690" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="District">
            <select value={district} onChange={e => setDistrict(e.target.value)} className={inputClass}>
              <option value="">Select district...</option>
              {BANGKOK_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Nearest BTS / MRT">
            <input type="text" value={nearestBts} onChange={e => setNearestBts(e.target.value)} className={inputClass} placeholder="Phrom Phong BTS" />
          </Field>
        </div>
      </Section>

      {/* Section C: Contact & Links */}
      <Section title="Contact & Links">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+66-2-XXX-XXXX" />
          </Field>
          <Field label="Website">
            <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} className={inputClass} placeholder="https://..." />
          </Field>
          <Field label="Instagram URL">
            <input type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} className={inputClass} placeholder="https://instagram.com/..." />
          </Field>
          <Field label="Facebook URL">
            <input type="url" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} className={inputClass} placeholder="https://facebook.com/..." />
          </Field>
          <Field label="LINE ID">
            <input type="text" value={lineId} onChange={e => setLineId(e.target.value)} className={inputClass} placeholder="@flowspace" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Booking Method">
            <select value={bookingMethod} onChange={e => setBookingMethod(e.target.value as BookingMethod | '')} className={inputClass}>
              <option value="">Select...</option>
              {BOOKING_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Booking URL">
            <input type="url" value={bookingUrl} onChange={e => setBookingUrl(e.target.value)} className={inputClass} placeholder="https://..." />
          </Field>
        </div>
      </Section>

      {/* Section D: Operating Info */}
      <Section title="Operating Hours & Pricing">
        <Field label="Operating Hours">
          <HoursEditor value={hours} onChange={setHours} />
        </Field>

        <div className="grid grid-cols-2 gap-6">
          <Field label="Price Range">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriceLevel(priceLevel === p ? null : p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    priceLevel === p
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {PRICE_LABELS[p]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Price (฿ THB)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">฿</span>
              <input
                type="number"
                min="0"
                value={priceThb}
                onChange={e => setPriceThb(e.target.value)}
                className={inputClass + ' pl-7'}
                placeholder="300 = 300฿/session"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Shown in app as the entry/usage price</p>
          </Field>
        </div>
      </Section>

      {/* Section E: Content */}
      <Section title="Content">
        <Field label={
          <span className="flex items-center gap-2">
            Short Description
            {aiDraft && (
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                AI Draft — please review
              </span>
            )}
          </span>
        }>
          <textarea
            value={shortDescription}
            onChange={e => setShortDescription(e.target.value)}
            rows={3}
            maxLength={300}
            className={inputClass + ' resize-none'}
            placeholder="2-3 sentence summary shown in app cards and previews..."
          />
          <p className="text-xs text-gray-400 text-right">{shortDescription.length}/300</p>
        </Field>

        <Field label="Long Description">
          <textarea
            value={longDescription}
            onChange={e => setLongDescription(e.target.value)}
            rows={5}
            className={inputClass + ' resize-none'}
            placeholder="Full description shown on the venue detail page..."
          />
        </Field>

        <Field label="Hero Image URL">
          <input
            type="url"
            value={heroImageUrl}
            onChange={e => setHeroImageUrl(e.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
          {heroImageUrl && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImageUrl} alt="Hero preview" className="h-32 w-auto rounded-lg object-cover" />
            </div>
          )}
        </Field>

        {photoUrls.length > 0 && (
          <Field label="Photos (auto-fetched)">
            <div className="grid grid-cols-5 gap-2">
              {photoUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="h-20 w-full rounded-lg object-cover" />
              ))}
            </div>
          </Field>
        )}
      </Section>

      {/* Section G: Admin Notes */}
      <Section title="Admin Note">
        <Field label="Internal note (optional — not shown in app)">
          <textarea
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
            rows={2}
            className={inputClass + ' resize-none'}
            placeholder="Found this on Lemon8, trending in Thonglor..."
          />
        </Field>
      </Section>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={() => submit('draft')} disabled={isPending}
          className="px-5 py-2.5 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
          Save as Draft
        </button>
        <button type="button" onClick={() => submit('approved')} disabled={isPending}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          Approve
        </button>
        <button type="button" onClick={() => submit('published')} disabled={isPending}
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
          Publish Now
        </button>
        <button type="button" onClick={() => router.back()} disabled={isPending}
          className="ml-auto px-5 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputClass =
  'w-full px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ChipInput({
  items, onAdd, onRemove, inputValue, onInputChange, suggestions, placeholder,
}: {
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  inputValue: string;
  onInputChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const filteredSuggestions = inputValue.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(inputValue.toLowerCase()) && !items.includes(s))
    : suggestions.filter(s => !items.includes(s)).slice(0, 6);

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map(item => (
            <span key={item} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-900 text-white text-xs font-medium">
              {item}
              <button type="button" onClick={() => onRemove(item)} className="hover:text-gray-300">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(inputValue); onInputChange(''); } }}
            placeholder={placeholder}
            className={inputClass + ' flex-1'}
          />
          <button
            type="button"
            onClick={() => { onAdd(inputValue); onInputChange(''); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Add
          </button>
        </div>
        {filteredSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {filteredSuggestions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => { onAdd(s); onInputChange(''); }}
                className="px-2 py-0.5 text-xs rounded-full border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
