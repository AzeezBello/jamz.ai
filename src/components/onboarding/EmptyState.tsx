import type { ComponentType, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

export interface EmptyStateProps {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  /** Concrete next actions, not restatements of the problem. */
  tips?: string[];
  action?: ReactNode;
  children?: ReactNode;
}

/**
 * A blank screen is the worst moment to say nothing. Every empty state here
 * explains what would fill it and gives something to press.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  tips,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
        <Icon className="w-6 h-6 text-[#ff8e8e]" aria-hidden={true} />
      </div>

      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <p className="text-white/45 text-sm max-w-md mx-auto">{description}</p>

      {tips && tips.length > 0 && (
        <ul className="mt-6 mx-auto max-w-md space-y-2 text-left">
          {tips.map((tip) => (
            <li
              key={tip}
              className="flex items-start gap-2.5 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5"
            >
              <Lightbulb className="w-4 h-4 text-[#ff8e8e] mt-0.5 shrink-0" aria-hidden="true" />
              <span className="text-white/60 text-sm">{tip}</span>
            </li>
          ))}
        </ul>
      )}

      {action && <div className="mt-7 flex justify-center gap-3">{action}</div>}
      {children}
    </div>
  );
}

/** A dismissible inline hint, remembered per user via dismissed_tips. */
export function InlineTip({
  id,
  children,
  onDismiss,
}: {
  id: string;
  children: ReactNode;
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#ff6b6b]/25 bg-[#ff6b6b]/[0.07] px-4 py-3 mb-4">
      <Lightbulb className="w-4 h-4 text-[#ff8e8e] mt-0.5 shrink-0" aria-hidden="true" />
      <p className="text-white/70 text-sm flex-1">{children}</p>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onDismiss(id)}
        className="text-white/40 hover:text-white -my-1"
      >
        Got it
      </Button>
    </div>
  );
}
