import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Loader2 } from 'lucide-react';
import AuthModal from '@/components/modals/AuthModal';
import { fetchPlans, startCheckout } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { track } from '@/lib/observability';
import type { BillingInterval, Plan } from '@/lib/types';

const BADGE: Record<string, string> = { pro: 'Most Popular', premier: 'Best Value' };

export default function Pricing() {
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

  return (
    <section ref={sectionRef} id="pricing" className="py-24 px-6 relative">
      <div className="max-w-[1400px] mx-auto">
        <div className="text-center mb-12">
          <h2
            className={`text-4xl md:text-5xl font-bold text-white mb-4 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          >
            Start making music for free
          </h2>
          <p className="text-white/60 text-lg">Select the plan that best fits your needs</p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm ${interval === 'monthly' ? 'text-white' : 'text-white/50'}`}>
            Monthly
          </span>
          <Switch
            checked={interval === 'yearly'}
            onCheckedChange={(checked) => setInterval(checked ? 'yearly' : 'monthly')}
            aria-label="Bill yearly"
            className="data-[state=checked]:bg-[#ff6b6b]"
          />
          <span className={`text-sm ${interval === 'yearly' ? 'text-white' : 'text-white/50'}`}>
            Yearly
          </span>
          {interval === 'yearly' && (
            <span className="text-xs text-[#ff6b6b] bg-[#ff6b6b]/10 px-2 py-1 rounded-full">
              save 25%
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[520px] rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, index) => {
              const badge = BADGE[plan.id];
              const isFree = plan.monthly_price_cents === 0;
              const isCurrent = profile?.plan_id === plan.id;

              // The yearly price is a full-year total; show it per month and
              // state the real saving rather than repeating the monthly price.
              const perMonthCents =
                interval === 'yearly'
                  ? Math.round(plan.yearly_price_cents / 12)
                  : plan.monthly_price_cents;
              const savingCents = plan.monthly_price_cents * 12 - plan.yearly_price_cents;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl transition-all duration-700 ${
                    badge === 'Most Popular'
                      ? 'bg-gradient-to-b from-white/10 to-white/5 border-2 border-[#ff6b6b]/50 md:scale-105 z-10'
                      : 'bg-white/5 border border-white/10 hover:border-white/20'
                  } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
                  style={{
                    transitionTimingFunction: 'var(--ease-out-expo)',
                    transitionDelay: `${400 + index * 100}ms`,
                  }}
                >
                  {badge && (
                    <span
                      className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold ${
                        badge === 'Most Popular'
                          ? 'gradient-coral text-black'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      {badge}
                    </span>
                  )}

                  <div className="p-6 lg:p-8">
                    <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                    <p className="text-white/50 text-sm mb-6">{plan.description}</p>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">
                          {formatMoney(perMonthCents)}
                        </span>
                        <span className="text-white/50">/month</span>
                      </div>
                      {interval === 'yearly' && !isFree && (
                        <p className="text-[#ff6b6b] text-sm mt-1">
                          {formatMoney(plan.yearly_price_cents)} billed yearly — saves{' '}
                          {formatMoney(savingCents)}
                        </p>
                      )}
                      {!isFree && (
                        <p className="text-white/40 text-xs mt-1">Taxes calculated at checkout</p>
                      )}
                    </div>

                    <Button
                      onClick={() => void handleSelect(plan)}
                      disabled={pendingPlan === plan.id || isCurrent}
                      className={`w-full mb-8 font-semibold ${
                        badge === 'Most Popular'
                          ? 'gradient-coral text-black hover:opacity-90'
                          : 'bg-white/10 text-white hover:bg-white/20'
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

                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-white/70">
                          <Check
                            className="w-4 h-4 text-[#ff6b6b] mt-0.5 flex-shrink-0"
                            aria-hidden="true"
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
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
