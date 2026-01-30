/**
 * InfoTooltip Component
 *
 * A small info icon (i) that reveals explanatory content on hover/focus.
 * Used next to form labels to provide additional context without cluttering
 * the main UI.
 *
 * Per CONTEXT.md: Info icon (i) with tooltip for unfamiliar terms.
 * Tooltips appear on hover/click.
 */

import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface InfoTooltipProps {
  /** Content to display in the tooltip */
  content: React.ReactNode;
}

/**
 * Info tooltip with accessible button trigger
 */
export function InfoTooltip({ content }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="More information"
          className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
        >
          <Info className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px]" sideOffset={4}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
