import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Check } from 'lucide-react';

const plans = [
  {
    name: "Free Plan",
    badge: null,
    description: "Our starter plan.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    cta: "Sign Up",
    features: [
      "Access to v4.5-all",
      "50 credits renew daily (10 songs)",
      "No commercial use",
      "Standard features only",
      "Upload up to 1 min of audio",
      "Shared creation queue",
      "No add-on credit purchases",
    ],
  },
  {
    name: "Pro Plan",
    badge: "Most Popular",
    description: "Access to our best models and editing tools.",
    monthlyPrice: 8,
    yearlyPrice: 8,
    yearlySavings: "Saves $24 by billing yearly!",
    cta: "Subscribe",
    features: [
      "Access to latest v5 model",
      "2,500 credits (up to 500 songs)",
      "Commercial use rights",
      "Standard + Pro features",
      "Split into 12 stems",
      "Upload up to 8 min audio",
      "Add vocals to existing songs",
      "Early access to new features",
      "Purchase add-on credits",
      "Priority queue, 10 songs at once",
    ],
  },
  {
    name: "Premier Plan",
    badge: "Best Value",
    description: "Maximum credits and every feature unlocked.",
    monthlyPrice: 24,
    yearlyPrice: 24,
    yearlySavings: "Saves $72 by billing yearly!",
    cta: "Subscribe",
    features: [
      "Access to Jamz Studio",
      "Access to latest v5 model",
      "10,000 credits (up to 2,000 songs)",
      "Commercial use rights",
      "Standard + Pro features",
      "Split into 12 stems",
      "Upload up to 8 min audio",
      "Add vocals to existing songs",
      "Early access to new features",
      "Purchase add-on credits",
      "Priority queue, 10 songs at once",
    ],
  },
];

export default function Pricing() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="pricing" className="py-24 px-6 relative">
      <div className="max-w-[1400px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2
            className={`text-4xl md:text-5xl font-bold text-white mb-4 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          >
            Start making music for free
          </h2>
          <p
            className={`text-white/60 text-lg transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          >
            Select the plan that best fits your needs
          </p>
        </div>

        {/* Toggle */}
        <div
          className={`flex items-center justify-center gap-4 mb-12 transition-all duration-500 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
          style={{ transitionTimingFunction: 'var(--ease-elastic)', transitionDelay: '200ms' }}
        >
          <span className={`text-sm ${!isYearly ? 'text-white' : 'text-white/50'}`}>Monthly</span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
            className="data-[state=checked]:bg-[#ff6b6b]"
          />
          <span className={`text-sm ${isYearly ? 'text-white' : 'text-white/50'}`}>Yearly</span>
          {isYearly && (
            <span className="text-xs text-[#ff6b6b] bg-[#ff6b6b]/10 px-2 py-1 rounded-full">
              save 20%
            </span>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 perspective-1000">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl transition-all duration-700 ${
                plan.badge === 'Most Popular'
                  ? 'bg-gradient-to-b from-white/10 to-white/5 border-2 border-[#ff6b6b]/50 scale-105 z-10'
                  : 'bg-white/5 border border-white/10 hover:border-white/20'
              } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
              style={{
                transitionTimingFunction: 'var(--ease-out-expo)',
                transitionDelay: `${400 + index * 100}ms`,
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold ${
                  plan.badge === 'Most Popular'
                    ? 'gradient-coral text-black'
                    : 'bg-white/10 text-white'
                }`}>
                  {plan.badge}
                </div>
              )}

              <div className="p-6 lg:p-8">
                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                  <p className="text-white/50 text-sm">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-white/50">/month</span>
                  </div>
                  {isYearly && plan.yearlySavings && (
                    <p className="text-[#ff6b6b] text-sm mt-1">{plan.yearlySavings}</p>
                  )}
                  {plan.name !== 'Free Plan' && (
                    <p className="text-white/40 text-xs mt-1">Taxes calculated at checkout</p>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  className={`w-full mb-8 font-semibold ${
                    plan.badge === 'Most Popular'
                      ? 'gradient-coral text-black hover:opacity-90'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {plan.cta}
                </Button>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-white/70"
                      style={{
                        animation: isVisible ? `fade-slide-up 0.3s var(--ease-smooth) ${600 + index * 100 + featureIndex * 50}ms forwards` : 'none',
                        opacity: 0,
                      }}
                    >
                      <Check className="w-4 h-4 text-[#ff6b6b] mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
