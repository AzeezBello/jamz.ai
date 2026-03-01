import { useEffect, useRef, useState } from 'react';
import { Wand2, Save, Download } from 'lucide-react';

const studioFeatures = [
  {
    icon: Wand2,
    title: "Experience the modern song maker",
    description: "Start, edit, remix—your way. Upload or record your own audio, rewrite lyrics, reorder sections, and reimagine your sound with powerful creative tools.",
  },
  {
    icon: Save,
    title: "Create everyday. Keep it all.",
    description: "Make up to 500 custom songs a month, with full commercial rights on the Pro plan. Get inspired, break genre boundaries, and own what you generate—no strings attached.",
  },
  {
    icon: Download,
    title: "Extract stems. Drop into your DAW.",
    description: "Export up to 12 time-aligned WAV stems and use them seamlessly in Ableton, Logic, or any DAW. Clean, structured, and ready for pro workflows.",
  },
];

export default function StudioFeatures() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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
    <section ref={sectionRef} className="py-24 px-6 relative">
      <div className="max-w-[1400px] mx-auto">
        <div className="space-y-24">
          {studioFeatures.map((feature, index) => {
            const Icon = feature.icon;
            const isEven = index % 2 === 1;

            return (
              <div
                key={feature.title}
                className={`flex flex-col ${isEven ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`}
              >
                {/* Text Content */}
                <div
                  className={`flex-1 ${isEven ? 'lg:text-right' : ''} transition-all duration-700 ${
                    isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${isEven ? 'translate-x-20' : '-translate-x-20'}`
                  }`}
                  style={{
                    transitionTimingFunction: 'var(--ease-out-expo)',
                    transitionDelay: `${index * 200}ms`,
                  }}
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl gradient-coral mb-6 ${isEven ? 'lg:ml-auto' : ''}`}>
                    <Icon className="w-7 h-7 text-black" />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-5">
                    {feature.title}
                  </h3>
                  <p className="text-white/60 text-lg leading-relaxed max-w-xl">
                    {feature.description}
                  </p>
                </div>

                {/* Visual Card */}
                <div
                  className={`flex-1 w-full max-w-lg transition-all duration-700 ${
                    isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${isEven ? '-translate-x-20' : 'translate-x-20'}`
                  }`}
                  style={{
                    transitionTimingFunction: 'var(--ease-out-expo)',
                    transitionDelay: `${100 + index * 200}ms`,
                  }}
                >
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-white/10 to-white/5 border border-white/10 group hover:border-white/20 transition-colors">
                    {/* Abstract visual representation */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-full h-full">
                        {/* Animated circles */}
                        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-[#ff6b6b]/20 blur-2xl animate-pulse" />
                        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full bg-[#ff8e8e]/20 blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
                        
                        {/* Center icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            <Icon className="w-12 h-12 text-[#ff6b6b]" />
                          </div>
                        </div>

                        {/* Decorative elements */}
                        <div className="absolute top-8 right-8 w-3 h-3 rounded-full bg-[#ff6b6b]" />
                        <div className="absolute bottom-12 left-12 w-2 h-2 rounded-full bg-[#ff8e8e]" />
                        <div className="absolute top-1/2 right-12 w-1.5 h-1.5 rounded-full bg-white/50" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
