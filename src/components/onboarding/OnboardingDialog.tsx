import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Compass, Music4, Share2, Sparkles, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { GENERATION_COST } from '@/lib/credits';

const STEPS = [
  {
    icon: Music4,
    title: 'Describe it, and Jamz makes it',
    body: 'Write a sentence about the song you want — a mood, a story, a genre. You can add your own lyrics and name the instruments, or leave those blank and let the model decide.',
  },
  {
    icon: Wallet,
    title: 'Credits, and what they buy',
    body: `Every song costs ${GENERATION_COST} credits. The free plan refills to 50 each day, which is ten songs. If a generation fails or you cancel it, the credits come straight back.`,
  },
  {
    icon: Share2,
    title: 'Private until you decide otherwise',
    body: 'New songs are private. Make one unlisted to share a link, or public to put it in Discover. You can change your mind at any time from the song menu.',
  },
];

/**
 * First-run intro. Shown once, then recorded on the profile — so it does not
 * reappear on another device or after clearing site data.
 */
export default function OnboardingDialog() {
  const active = useOnboardingStore((state) => state.active);
  const finishOnboarding = useOnboardingStore((state) => state.finishOnboarding);
  const profile = useAuthStore((state) => state.profile);
  const [index, setIndex] = useState(0);

  if (active !== 'onboarding') return null;

  const step = STEPS[index];
  const Icon = step.icon;
  const isLast = index === STEPS.length - 1;
  const name = profile?.display_name?.split(' ')[0];

  return (
    <Dialog open onOpenChange={(open) => !open && void finishOnboarding()}>
      <DialogContent className="sm:max-w-lg bg-[#0a0a0a] border-white/10 text-white">
        <div className="py-2">
          <p className="text-[#ff8e8e] text-xs uppercase tracking-[0.2em] font-semibold mb-3">
            {name ? `Welcome, ${name}` : 'Welcome to Jamz'}
          </p>

          <div className="w-14 h-14 rounded-2xl gradient-coral flex items-center justify-center mb-5">
            <Icon className="w-7 h-7 text-black" aria-hidden="true" />
          </div>

          <DialogTitle className="text-2xl font-bold mb-3">{step.title}</DialogTitle>
          <DialogDescription className="text-white/60 leading-relaxed">
            {step.body}
          </DialogDescription>

          <ol className="flex gap-2 mt-8 mb-6" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
            {STEPS.map((item, position) => (
              <li
                key={item.title}
                aria-current={position === index ? 'step' : undefined}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  position <= index ? 'bg-[#ff6b6b]' : 'bg-white/10'
                }`}
              />
            ))}
          </ol>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => void finishOnboarding()}
              className="text-white/50 hover:text-white"
            >
              Skip
            </Button>

            <div className="flex items-center gap-2">
              {index > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setIndex(index - 1)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Back
                </Button>
              )}

              {isLast ? (
                <Button
                  onClick={() => void finishOnboarding({ startTour: true })}
                  className="gradient-coral text-black font-semibold"
                >
                  <Compass className="w-4 h-4 mr-2" aria-hidden="true" />
                  Show me around
                </Button>
              ) : (
                <Button
                  onClick={() => setIndex(index + 1)}
                  className="gradient-coral text-black font-semibold"
                >
                  <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
