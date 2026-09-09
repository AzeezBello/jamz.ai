import { forwardRef, type ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type ButtonProps = ComponentProps<typeof Button>;

export interface IconButtonProps extends Omit<ButtonProps, 'aria-label'> {
  /** Serves as both the accessible name and the tooltip text. */
  label: string;
  /** Where the tooltip sits relative to the button. */
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * An icon-only button with its label in one place.
 *
 * Icon buttons were labelled for screen readers but showed nothing on hover,
 * so sighted users had to guess. Taking a single `label` keeps the tooltip and
 * the accessible name from drifting apart.
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, side = 'top', children, ...props }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button ref={ref} aria-label={label} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side} className="bg-[#1a1a1a] border-white/10 text-white">
        {label}
      </TooltipContent>
    </Tooltip>
  ),
);
IconButton.displayName = 'IconButton';

export default IconButton;
