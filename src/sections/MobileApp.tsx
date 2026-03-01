import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star, Apple, Smartphone } from 'lucide-react';

export default function MobileApp() {
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
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2
            className={`text-4xl md:text-5xl font-bold text-white mb-4 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          >
            The #1 AI music app
          </h2>
          <p
            className={`text-white/60 text-lg max-w-xl mx-auto transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          >
            Where you can discover, create and share from anywhere because music has no boundaries.
          </p>
        </div>

        {/* App Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* iPhone Card */}
          <div
            className={`group relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
            }`}
            style={{
              transitionTimingFunction: 'var(--ease-out-expo)',
              transitionDelay: '400ms',
            }}
          >
            <div className="p-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium mb-4">
                <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                Top 10 music app
              </div>

              {/* Rating */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-yellow-400"
                      fill="currentColor"
                      style={{
                        animation: isVisible ? `scale-in 0.2s var(--ease-elastic) ${800 + i * 50}ms forwards` : 'none',
                        opacity: 0,
                      }}
                    />
                  ))}
                </div>
                <div className="text-white">
                  <span className="text-2xl font-bold">4.9</span>
                </div>
                <div className="text-white/50 text-sm">363k+ reviews</div>
              </div>

              {/* App Preview */}
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-6 group-hover:scale-[1.02] transition-transform duration-500">
                <img
                  src="/images/app-iphone.jpg"
                  alt="Jamz iPhone App"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Download Button */}
              <Button className="w-full bg-white text-black hover:bg-white/90 font-semibold flex items-center justify-center gap-2">
                <Apple className="w-5 h-5" />
                Download on iPhone
              </Button>
            </div>
          </div>

          {/* Android Card */}
          <div
            className={`group relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
            }`}
            style={{
              transitionTimingFunction: 'var(--ease-out-expo)',
              transitionDelay: '550ms',
            }}
          >
            <div className="p-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium mb-4">
                <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                Top 10 music app
              </div>

              {/* Rating */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-yellow-400"
                      fill="currentColor"
                      style={{
                        animation: isVisible ? `scale-in 0.2s var(--ease-elastic) ${900 + i * 50}ms forwards` : 'none',
                        opacity: 0,
                      }}
                    />
                  ))}
                </div>
                <div className="text-white">
                  <span className="text-2xl font-bold">4.8</span>
                </div>
                <div className="text-white/50 text-sm">653k+ reviews</div>
              </div>

              {/* App Preview */}
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-6 group-hover:scale-[1.02] transition-transform duration-500">
                <img
                  src="/images/app-android.jpg"
                  alt="Jamz Android App"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Download Button */}
              <Button className="w-full bg-white text-black hover:bg-white/90 font-semibold flex items-center justify-center gap-2">
                <Smartphone className="w-5 h-5" />
                Download on Android
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
