import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Mic, Music, OctagonX, Sliders, Sparkles, Wand2 } from 'lucide-react';
import { useGenerationStore } from '@/store/generationStore';
import { canCancel, describeJob } from '@/lib/job-state';
import { usePlayerStore } from '@/store/playerStore';

const STEPS = [
  { icon: Sparkles, label: 'Analyzing', threshold: 15 },
  { icon: Music, label: 'Composing', threshold: 30 },
  { icon: Wand2, label: 'Arranging', threshold: 50 },
  { icon: Mic, label: 'Performing', threshold: 70 },
  { icon: Sliders, label: 'Mixing', threshold: 85 },
  { icon: Check, label: 'Complete', threshold: 100 },
];

/**
 * Rendered once at the layout level and driven entirely by the job row, so it
 * survives navigation and reloads. Closing it no longer stops the work —
 * cancelling does, on the server, with a refund.
 */
export default function GenerationModal() {
  const navigate = useNavigate();
  const { job, lastSong, error, dismissed, cancel, dismiss } = useGenerationStore();
  const play = usePlayerStore((s) => s.play);

  const open = (Boolean(job) && !dismissed) || Boolean(error);

  // A cancelled job needs no further attention; close it out.
  useEffect(() => {
    if (job?.status === 'cancelled') {
      const timer = setTimeout(dismiss, 1200);
      return () => clearTimeout(timer);
    }
  }, [job?.status, dismiss]);

  if (!open) return null;

  const progress = job?.progress ?? 0;
  const activeStep = STEPS.reduce(
    (acc, step, index) => (progress >= step.threshold ? index : acc),
    -1,
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-white/10 text-white">
        {job?.status === 'completed' && lastSong ? (
          <div className="text-center py-6">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full gradient-coral flex items-center justify-center">
              <Check className="w-9 h-9 text-black" aria-hidden="true" />
            </div>
            <DialogTitle className="text-2xl font-bold mb-2">
              "{lastSong.title}" is ready
            </DialogTitle>
            <DialogDescription className="text-white/60 mb-6">
              It's saved to your library. Songs are private until you share them.
            </DialogDescription>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={() => {
                  void play(lastSong, [lastSong]);
                  dismiss();
                }}
                className="gradient-coral text-black font-semibold"
              >
                Play it
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  dismiss();
                  navigate(`/song/${lastSong.id}`);
                }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Open song page
              </Button>
            </div>
          </div>
        ) : job?.status === 'failed' || error ? (
          <div className="text-center py-6">
            <OctagonX className="w-14 h-14 text-[#ff6b6b] mx-auto mb-4" aria-hidden="true" />
            <DialogTitle className="text-2xl font-bold mb-2">Generation failed</DialogTitle>
            <DialogDescription className="text-white/60 mb-2">
              {job?.error_message ?? error}
            </DialogDescription>
            {job?.status === 'failed' && (
              <p className="text-white/40 text-sm mb-6">
                Your {job.credits_cost} credits have been returned.
              </p>
            )}
            <Button onClick={dismiss} className="gradient-coral text-black font-semibold">
              Close
            </Button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="relative w-24 h-24 mx-auto mb-6" aria-hidden="true">
              <div className="absolute inset-0 rounded-full gradient-coral opacity-20 animate-ping" />
              <div className="absolute inset-2 rounded-full gradient-coral opacity-40 animate-pulse" />
              <div className="absolute inset-4 rounded-full gradient-coral flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-black animate-spin" />
              </div>
            </div>

            <DialogTitle className="text-2xl font-bold mb-2">Creating your song</DialogTitle>
            <DialogDescription className="text-white/60 mb-6" aria-live="polite">
              {job ? describeJob(job) : 'Starting…'}
            </DialogDescription>

            <div
              className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-8"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Generation progress"
            >
              <div
                className="absolute inset-y-0 left-0 gradient-coral rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <ol className="flex justify-between mb-8" aria-hidden="true">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const done = index <= activeStep;
                return (
                  <li
                    key={step.label}
                    className={`flex flex-col items-center gap-1 transition-opacity ${done ? 'opacity-100' : 'opacity-30'}`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        done ? 'gradient-coral' : 'bg-white/10'
                      } ${index === activeStep ? 'scale-110 ring-2 ring-[#ff6b6b] ring-offset-2 ring-offset-[#0a0a0a]' : ''}`}
                    >
                      <Icon className={`w-4 h-4 ${done ? 'text-black' : 'text-white/50'}`} />
                    </span>
                    <span className="text-[10px] text-white/50">{step.label}</span>
                  </li>
                );
              })}
            </ol>

            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => void cancel()}
                disabled={!job || !canCancel(job)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                {job?.cancel_requested ? 'Cancelling…' : 'Cancel and refund'}
              </Button>
              <Button variant="ghost" onClick={dismiss} className="text-white/60 hover:text-white">
                Run in background
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
