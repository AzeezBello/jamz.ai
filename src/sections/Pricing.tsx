import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Disc3, Loader2 } from 'lucide-react';
import AuthModal from '@/components/modals/AuthModal';
import { fetchPlans, startCheckout } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { track } from '@/lib/observability';
import type { BillingInterval, Plan } from '@/lib/types';

const BADGE: Record<string, string> = { pro: 'Most Popular', premier: 'Best Value' };

interface PricingProps {
  standalone?: boolean;
}

export default function Pricing({ standalone = false }: PricingProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    void fetchPlans()
      .then(setPlans)
      .catch(() => toast.error('Could not load plans.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSelect = async (plan: Plan) => {
    if (!session) {
      setShowAuthModal(true);
      return;
    }
    if (plan.monthly_price_cents === 0) {
      toast.message('The free plan is already yours', {
        description: 'It refreshes 50 credits every day.',
      });
      return;
    }

    setPendingPlan(plan.id);
    track('checkout_started', { plan: plan.id, interval });
    try {
      window.location.assign(await startCheckout(plan.id, interval));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start checkout.');
      setPendingPlan(null);
    }
  };

  const HeadingTag = standalone ? 'h1' : 'h2';

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="py-24 sm:py-28 px-4 sm:px-6 relative border-b border-white/[0.07]"
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Asymmetric Header + Billing Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-14">
          <div
            className={`motion-reveal ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="inline-flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#ff8e8e] mb-4">
              <Disc3 className="w-3.5 h-3.5" aria-hidden="true" />
              05 // LICENSING &amp; CREDIT ALLOCATION
            </div>
            <HeadingTag className="font-display text-display-section font-bold text-white mb-3">
              Start making music for free
            </HeadingTag>
            <p className="text-white/60 text-base sm:text-lg max-w-[52ch]">
              Select the studio allocation that matches your output. Upgrade anytime for commercial
              master ownership and multi-track WAV stem exports.
            </p>
          </div>

          {/* Tactile Billing Interval Dock */}
          <div className="studio-surface rounded-2xl px-5 py-3.5 flex items-center gap-4 self-start lg:self-auto">
            <span
              className={`font-mono-tech text-xs uppercase tracking-wider ${
                interval === 'monthly' ? 'text-white font-semibold' : 'text-white/45'
              }`}
            >
              Monthly
            </span>
            <Switch
              checked={interval === 'yearly'}
              onCheckedChange={(checked) => setInterval(checked ? 'yearly' : 'monthly')}
              aria-label="Bill yearly"
              className="data-[state=checked]:bg-[#ff6b6b]"
            />
            <span
              className={`font-mono-tech text-xs uppercase tracking-wider ${
                interval === 'yearly' ? 'text-white font-semibold' : 'text-white/45'
              }`}
            >
              Yearly
            </span>
            <span className="font-mono-tech text-[11px] text-[#ff8e8e] bg-[#ff6b6b]/12 border border-[#ff6b6b]/30 px-2.5 py-0.5 rounded-full">
              save 25%
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[520px] rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7 items-stretch">
            {plans.map((plan, index) => {
              const badge = BADGE[plan.id];
              const isFree = plan.monthly_price_cents === 0;
              const isCurrent = profile?.plan_id === plan.id;

              const perMonthCents =
                interval === 'yearly'
                  ? Math.round(plan.yearly_price_cents / 12)
                  : plan.monthly_price_cents;
              const savingCents = plan.monthly_price_cents * 12 - plan.yearly_price_cents;

              return (
                <article
                  key={plan.id}
                  className={`relative rounded-2xl flex flex-col motion-reveal ${
                    badge === 'Most Popular'
                      ? 'studio-surface border-[#ff6b6b]/55 shadow-[0_24px_48px_-18px_rgba(255,107,107,0.22)]'
                      : 'studio-surface'
                  } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                  style={{
                    transitionDelay: `${180 + index * 100}ms`,
                  }}
                >
                  {badge && (
                    <span
                      className={`absolute -top-3.5 right-6 px-3.5 py-1 rounded-full font-mono-tech text-[11px] uppercase tracking-wider font-semibold ${
                        badge === 'Most Popular'
                          ? 'gradient-coral text-black'
                          : 'bg-white/12 border border-white/20 text-white'
                      }`}
                    >
                      {badge}
                    </span>
                  )}

                  <div className="p-6 lg:p-8 flex flex-col flex-1">
                    <h3 className="font-display text-2xl font-bold text-white mb-1.5">
                      {plan.name}
                    </h3>
                    <p className="text-white/55 text-sm mb-6 min-h-[2.5rem]">{plan.description}</p>

                    <div className="studio-well rounded-xl p-4 mb-6">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono-tech text-4xl font-bold text-white">
                          {formatMoney(perMonthCents)}
                        </span>
                        <span className="font-mono-tech text-xs text-white/50">/month</span>
                      </div>
                      {interval === 'yearly' && !isFree && (
                        <p className="font-mono-tech text-[#ff8e8e] text-xs mt-1.5">
                          {formatMoney(plan.yearly_price_cents)} billed yearly — saves{' '}
                          {formatMoney(savingCents)}
                        </p>
                      )}
                      {!isFree ? (
                        <p className="font-mono-tech text-white/40 text-[11px] mt-1">
                          Taxes calculated at checkout
                        </p>
                      ) : (
                        <p className="font-mono-tech text-white/40 text-[11px] mt-1">
                          No credit card required
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={() => void handleSelect(plan)}
                      disabled={pendingPlan === plan.id || isCurrent}
                      className={`w-full mb-7 font-semibold py-5 rounded-xl ${
                        badge === 'Most Popular'
                          ? 'gradient-coral text-black hover:opacity-90'
                          : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                      }`}
                    >
                      {pendingPlan === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : isCurrent ? (
                        'Current plan'
                      ) : isFree ? (
                        'Sign up'
                      ) : (
                        'Subscribe'
                      )}
                    </Button>

                    <ul className="space-y-3 pt-5 border-t border-white/[0.08] flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-white/75">
                          <Check
                            className="w-4 h-4 text-[#ff6b6b] mt-0.5 flex-shrink-0"
                            aria-hidden="true"
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab="signup"
      />
    </section>
  );
}
