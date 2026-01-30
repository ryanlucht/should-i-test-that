/**
 * Mode Selection Component
 *
 * Card-based mode selection for the Welcome page using RadioGroup semantics.
 * Allows users to choose between Basic and Advanced calculator modes.
 *
 * Design reference: .planning/phases/01-foundation-wizard-infrastructure/designs/welcome-screen.md
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Mode } from '@/types/wizard';

/**
 * Mode option configuration
 */
interface ModeOption {
  id: Mode;
  title: string;
  description: string;
  features: string[];
}

/**
 * Predefined mode options with descriptions from CONTEXT.md
 * - Basic: "Quick estimate, fewer inputs"
 * - Advanced: "Precise value, more inputs"
 */
const modeOptions: ModeOption[] = [
  {
    id: 'basic',
    title: 'Basic Mode',
    description: 'Quick estimate, fewer inputs',
    features: [
      'EVPI calculation (max test value ceiling)',
      '3 business inputs',
      'Guided prior selection',
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced Mode',
    description: 'Precise value, more inputs',
    features: [
      'EVSI calculation (realistic test value)',
      'Test design inputs',
      'Cost of Delay analysis',
    ],
  },
];

interface ModeSelectionProps {
  /** Currently selected mode */
  selectedMode: Mode;
  /** Callback when mode selection changes */
  onModeSelect: (mode: Mode) => void;
}

/**
 * Mode Selection Component
 *
 * Renders two selectable cards for Basic and Advanced modes.
 * Uses RadioGroup for proper accessibility (keyboard nav, aria attributes).
 */
export function ModeSelection({
  selectedMode,
  onModeSelect,
}: ModeSelectionProps) {
  return (
    <RadioGroup
      value={selectedMode}
      onValueChange={(value) => onModeSelect(value as Mode)}
      className="grid grid-cols-1 sm:grid-cols-2 gap-6 justify-center max-w-[768px] mx-auto"
    >
      {modeOptions.map((option) => {
        const isSelected = selectedMode === option.id;

        return (
          <Label
            key={option.id}
            htmlFor={option.id}
            className="cursor-pointer block"
          >
            {/*
             * Card Design Spec:
             * - Max width: 360px each
             * - Border radius: 12px
             * - Padding: 24px
             * - Selected: purple border (#7C3AED), subtle purple tint (#F9F5FF)
             * - Hover: elevated shadow, translateY(-2px)
             */}
            <Card
              className={cn(
                'h-full max-w-[360px] mx-auto rounded-xl transition-all duration-200',
                'shadow-sm hover:shadow-lg hover:-translate-y-0.5',
                isSelected
                  ? 'border-2 border-primary bg-selected ring-2 ring-primary/15'
                  : 'border-2 border-border hover:border-muted-foreground/30'
              )}
            >
              <CardHeader className="p-6 pb-3">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <CardTitle className="text-xl font-semibold">{option.title}</CardTitle>
                </div>
                <CardDescription className="ml-7 text-sm">
                  {option.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0 ml-7">
                <ul className="text-sm text-muted-foreground space-y-2">
                  {option.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span
                        className={cn(
                          'mt-1.5 size-1.5 rounded-full shrink-0',
                          isSelected ? 'bg-primary' : 'bg-muted-foreground/40'
                        )}
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
