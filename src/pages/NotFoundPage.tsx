import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-7xl font-bold text-gradient mb-4">404</p>
      <h1 className="text-2xl font-semibold text-white mb-3">We couldn't find that page</h1>
      <p className="text-white/50 max-w-md mb-8">
        The link may be broken, or the song it pointed to was deleted or made private.
      </p>
      <Button asChild className="gradient-coral text-black font-semibold">
        <Link to="/">Back to Jamz</Link>
      </Button>
    </div>
  );
}
