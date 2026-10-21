import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RadioTower } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[75dvh] flex flex-col items-center justify-center px-4 sm:px-6 pt-24 pb-16">
      <div className="studio-surface rounded-2xl p-8 sm:p-12 max-w-lg w-full text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#ff8e8e] mb-6">
          <RadioTower className="w-3.5 h-3.5" aria-hidden="true" />
          SIGNAL LOST // NO CARRIER
        </div>

        <p className="font-mono-tech text-6xl sm:text-7xl font-bold text-gradient mb-3">404</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
          We couldn&apos;t find that page
        </h1>
        <p className="text-white/55 text-sm sm:text-base leading-relaxed mb-8">
          The link may be broken, or the song it pointed to was deleted or set to private by its
          creator.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="gradient-coral text-black font-semibold rounded-xl px-6">
            <Link to="/">Back to Jamz</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10 rounded-xl px-5"
          >
            <Link to="/pricing">View Plans</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
