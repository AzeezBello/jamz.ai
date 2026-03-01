import { useEffect, useRef, useState } from 'react';
import { Music, Share2, Sliders, Copyright, Layout, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: "10 free songs, daily",
    description: "Turn any moment into customized music instantly — from your commute to inside jokes. Express what words can't. Free forever, no subscription needed.",
  },
  {
    icon: Music,
    title: "Free AI music generator",
    description: "Discover what's possible when anyone can make music. Access the market-leading AI song generator to explore millions of songs—remixes, jokes, and raw emotion.",
  },
  {
    icon: Share2,
    title: "Share it with the world",
    description: "Make music that matters to you, then share it with people who'll feel it too. From your inner circle to millions of music fans, your next track can go far.",
  },
  {
    icon: Sliders,
    title: "Granular creation controls",
    description: "Steer your style with Personas, Inspo, exclusions, and vocal gender. Or get even more granular and experiment with weirdness and style sliders.",
  },
  {
    icon: Copyright,
    title: "Commercial rights to your songs",
    description: "Songs you create as a paid Jamz subscriber are yours to keep and do whatever you want with them, from using them as background music in videos to publishing an album.",
  },
  {
    icon: Layout,
    title: "Your complete creative workspace",
    description: "Jamz Studio is a first-of-its-kind web-based generative audio workstation that combines traditional DAW functionality with AI-powered music creation.",
  },
];

export default function Features() {
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
    <section ref={sectionRef} id="create" className="py-24 px-6 relative">
      <div className="max-w-[1400px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2
            className={`text-4xl md:text-5xl font-bold text-white mb-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          >
            Everything you need to make music your way
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.07] transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
                }`}
                style={{
                  transitionTimingFunction: 'var(--ease-out-expo)',
                  transitionDelay: `${200 + index * 100}ms`,
                }}
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl gradient-coral flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-black" />
                </div>

                {/* Content */}
                <h3 className="text-white font-semibold text-xl mb-3">{feature.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
