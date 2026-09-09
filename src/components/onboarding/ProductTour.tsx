import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { TOUR_STEPS } from '@/lib/tour-steps';

const PADDING = 8;
const CARD_WIDTH = 320;
/** Approximate; only used to keep the card inside the viewport. */
const CARD_HEIGHT = 230;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * A guided walkthrough that spotlights real elements rather than showing
 * screenshots, so it cannot drift out of date with the UI. A step whose target
 * is not on the page (different route, hidden at this breakpoint) is skipped
 * rather than pointing at nothing.
 */
export default function ProductTour() {
  const active = useOnboardingStore((state) => state.active);
  const step = useOnboardingStore((state) => state.tourStep);
  const setStep = useOnboardingStore((state) => state.setTourStep);
  const finishTour = useOnboardingStore((state) => state.finishTour);

  const [rect, setRect] = useState<Rect | null>(null);
  // Which step the current measurement belongs to. The card is only drawn once
  // its position is known, so it appears where it belongs instead of sliding
  // across the screen after the target is measured.
  const [measuredStep, setMeasuredStep] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const running = active === 'tour';

  const measure = useCallback(() => {
    const current = TOUR_STEPS[step];
    if (!current) return;
    const element = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
    if (!element) {
      setRect(null);
      return;
    }
    const box = element.getBoundingClientRect();
    setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
  }, [step]);

  useEffect(() => {
    if (!running) return;

    const current = TOUR_STEPS[step];
    const element = current
      ? document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`)
      : null;

    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });

    // Measure after the scroll settles, then keep up with layout changes.
    const timer = setTimeout(() => {
      measure();
      setMeasuredStep(step);
    }, 320);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [running, step, measure]);

  useEffect(() => {
    if (running) cardRef.current?.focus();
  }, [running, step]);

  useEffect(() => {
    if (!running) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void finishTour();
      if (event.key === 'ArrowRight') setStep(Math.min(step + 1, TOUR_STEPS.length - 1));
      if (event.key === 'ArrowLeft') setStep(Math.max(step - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, step, setStep, finishTour]);

  if (!running) return null;

  const current = TOUR_STEPS[step];
  if (!current) return null;

  const isLast = step === TOUR_STEPS.length - 1;
  const placed = measuredStep === step;

  // Prefer below the target, flip above when there is no room, then clamp into
  // the viewport. Without the clamp a tall target — the studio panel is nearly
  // a full screen — pushed the card off the bottom, leaving the spotlight
  // visible with no instructions beside it.
  const spaceBelow = rect ? window.innerHeight - (rect.top + rect.height) : 0;
  const below = !rect || spaceBelow > CARD_HEIGHT + PADDING * 2;
  const preferredTop = rect
    ? below
      ? rect.top + rect.height + PADDING + 8
      : rect.top - CARD_HEIGHT - PADDING
    : 120;
  const cardTop = Math.min(
    Math.max(preferredTop, 16),
    Math.max(window.innerHeight - CARD_HEIGHT - 16, 16),
  );
  const cardLeft = rect
    ? Math.min(Math.max(rect.left, 16), Math.max(window.innerWidth - CARD_WIDTH - 16, 16))
    : Math.max(window.innerWidth / 2 - CARD_WIDTH / 2, 16);

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="presentation">
      {rect ? (
        // The cut-out is a huge spread shadow around the target, which dims
        // everything else without covering the element itself.
        <div
          aria-hidden="true"
          className="absolute rounded-xl ring-2 ring-[#ff6b6b] transition-all duration-300 pointer-events-none"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-black/72" />
      )}

      {placed && (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Tour step ${step + 1} of ${TOUR_STEPS.length}: ${current.title}`}
          tabIndex={-1}
          className="absolute w-[320px] rounded-2xl border border-white/15 bg-[#111] p-5 shadow-2xl outline-none"
          style={{ top: cardTop, left: cardLeft }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="text-white font-semibold">{current.title}</h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void finishTour()}
              aria-label="End tour"
              className="h-7 w-7 -mt-1 -mr-1 text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>

          <p className="text-white/60 text-sm leading-relaxed">{current.body}</p>

          {!rect && (
            <p className="mt-3 text-xs text-white/35">
              This part of the app is not on screen right now.
            </p>
          )}

          <div className="flex items-center justify-between mt-5">
            <span className="text-xs text-white/30 tabular-nums">
              {step + 1} / {TOUR_STEPS.length}
            </span>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStep(step - 1)}
                  className="text-white/60 hover:text-white"
                >
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => (isLast ? void finishTour() : setStep(step + 1))}
                className="gradient-coral text-black font-semibold"
              >
                {isLast ? 'Done' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
