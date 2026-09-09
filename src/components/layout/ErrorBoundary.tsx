import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { reportError } from '@/lib/observability';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Last line of defence: a render crash should show something recoverable
 * rather than a blank page. Wire `captureException` here when Sentry is added.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info);
    reportError(error, { componentStack: info.componentStack });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold mb-3">Something broke</h1>
          <p className="text-white/60 mb-6">
            The page hit an unexpected error. Reloading usually clears it.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="gradient-coral text-black font-semibold"
          >
            Reload
          </Button>
        </div>
      </div>
    );
  }
}
