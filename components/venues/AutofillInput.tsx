'use client';

import { useState } from 'react';
import type { AutofillVenueData } from '@/types/autofill';
import AutofillComparePanel from './AutofillComparePanel';

type DetectedType = 'name' | 'google_maps' | 'website' | null;
type Step = 'idle' | 'step1_fetching' | 'step1_done' | 'step2_fetching' | 'step2_done';

// ── Terminal-style process log ────────────────────────────────────────────────
function ProcessLog({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="rounded-lg bg-gray-950 border border-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
        <span className="text-[10px] text-gray-500 font-mono ml-1">process log</span>
      </div>
      <div className="p-3 font-mono text-[11px] leading-relaxed space-y-0.5 max-h-48 overflow-y-auto">
        {lines.map((line, i) => {
          const isOk = line.includes('✓');
          const isErr = line.includes('✗');
          const isArrow = line.includes('→');
          const color = isOk ? 'text-green-400' : isErr ? 'text-red-400' : isArrow ? 'text-blue-300' : 'text-gray-300';
          // Split timestamp from message for styling
          const match = line.match(/^(\[\d{2}:\d{2}:\d{2}\])\s(.+)$/);
          return (
            <div key={i} className={color}>
              {match ? (
                <><span className="text-gray-600">{match[1]}</span> {match[2]}</>
              ) : line}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AutofillInputProps {
  onResult: (data: AutofillVenueData, descriptionIsAi: boolean) => void;
}

function detectInputType(value: string): DetectedType {
  if (!value.trim()) return null;
  if (/maps\.google|goo\.gl\/maps|google\.com\/maps/i.test(value)) return 'google_maps';
  if (/^https?:\/\//i.test(value)) return 'website';
  return 'name';
}

const TYPE_LABELS: Record<Exclude<DetectedType, null>, string> = {
  name: 'Venue name',
  google_maps: 'Google Maps URL',
  website: 'Website URL',
};

export default function AutofillInput({ onResult }: AutofillInputProps) {
  const [input, setInput] = useState('');
  const [detectedType, setDetectedType] = useState<DetectedType>(null);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);

  // Step 1 result — kept for compare step
  const [geminiResult, setGeminiResult] = useState<Partial<AutofillVenueData> | null>(null);
  // Step 2 compare data
  const [compareData, setCompareData] = useState<{ gemini: Partial<AutofillVenueData>; google: Partial<AutofillVenueData> } | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  // Process log
  const [processLog, setProcessLog] = useState<string[]>([]);

  function handleInputChange(v: string) {
    setInput(v);
    setDetectedType(detectInputType(v));
    setError(null);
    if (step !== 'idle') {
      setStep('idle');
      setGeminiResult(null);
      setCompareData(null);
      setProcessLog([]);
    }
  }

  // ── Step 1: Gemini fetch ────────────────────────────────────────────────────
  async function handleStep1() {
    if (!input.trim()) return;
    setError(null);
    setStep('step1_fetching');
    setGeminiResult(null);
    setCompareData(null);
    setProcessLog([]);

    try {
      const res = await fetch('/api/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim(), input_type: 'auto' }),
      });

      const data = await res.json();
      if (data.process_log) setProcessLog(data.process_log);

      if (!res.ok) {
        setError(data.error ?? 'Auto-fill failed. Try a different input or enter details manually.');
        setStep('idle');
        return;
      }

      setGeminiResult(data.venue);
      setStep('step1_done');
      onResult(data.venue, data.venue?.description_is_ai ?? false);
    } catch {
      setError('Network error. Please check your connection.');
      setStep('idle');
    }
  }

  // ── Step 2: Compare with Google Maps ───────────────────────────────────────
  async function handleStep2() {
    if (!input.trim()) return;
    setError(null);
    setStep('step2_fetching');

    try {
      const res = await fetch('/api/autofill/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      });

      const data = await res.json();
      if (data.process_log) setProcessLog(prev => [...prev, '', ...data.process_log]);

      if (!res.ok) {
        setError(data.error ?? 'Google Maps comparison failed.');
        setStep('step1_done');
        return;
      }

      setCompareData({ gemini: data.gemini, google: data.google });
      setStep('step2_done');
      setShowCompare(true);
    } catch {
      setError('Network error during comparison.');
      setStep('step1_done');
    }
  }

  function handleCompareApply(merged: Partial<AutofillVenueData>) {
    const full: AutofillVenueData = {
      ...(geminiResult ?? {}),
      ...merged,
      sources_used: ['gemini', 'google'],
      description_is_ai: geminiResult?.description_is_ai ?? false,
    };
    setShowCompare(false);
    onResult(full, full.description_is_ai ?? false);
  }

  const isFetching = step === 'step1_fetching' || step === 'step2_fetching';

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Auto-fill</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Enter a venue name or paste a Google Maps / website URL to auto-populate the form.
          </p>
        </div>

        {/* Input row */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && step === 'idle') { e.preventDefault(); handleStep1(); } }}
              placeholder="Flow Space Yoga — or paste a URL..."
              className="w-full px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent pr-28 bg-white"
            />
            {detectedType && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                {TYPE_LABELS[detectedType]}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleStep1}
            disabled={isFetching || !input.trim()}
            className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {step === 'step1_fetching' ? 'Fetching…' : 'Fetch Data'}
          </button>
        </div>

        {/* Step 1 result banner */}
        {step === 'step1_done' || step === 'step2_fetching' || step === 'step2_done' ? (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            {/* Step 1 done */}
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold shrink-0">1</span>
              <span className="text-sm font-medium text-gray-700">✦ Gemini AI data ready</span>
              <span className="text-xs text-gray-400 ml-1">— form pre-filled below</span>
            </div>

            {/* Step 2 — compare button */}
            <div className="flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step === 'step2_done' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>2</span>

              {step === 'step2_fetching' ? (
                <span className="text-sm text-gray-500 animate-pulse">Fetching Google Maps data…</span>
              ) : step === 'step2_done' ? (
                <button
                  type="button"
                  onClick={() => setShowCompare(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  📍 Re-open comparison panel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStep2}
                  disabled={isFetching}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Compare with Google Maps
                </button>
              )}

              {step !== 'step2_done' && (
                <span className="text-xs text-gray-400">Verify accuracy with live Google data</span>
              )}
            </div>
          </div>
        ) : step === 'step1_fetching' ? (
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span className="animate-pulse">Searching with Gemini AI…</span>
            </div>
          </div>
        ) : null}

        {/* Process log terminal */}
        <ProcessLog lines={processLog} />

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Compare modal */}
      {showCompare && compareData && (
        <AutofillComparePanel
          gemini={compareData.gemini}
          google={compareData.google}
          onApply={handleCompareApply}
          onClose={() => setShowCompare(false)}
        />
      )}
    </>
  );
}
