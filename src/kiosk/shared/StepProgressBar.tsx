import { cn } from "@/lib/utils";

interface StepProgressBarProps {
  stepIndex: number; // 0-based
  totalSteps: number;
}

/**
 * Dot-based visual progress indicator for kiosk wizard steps.
 *
 * Renders one dot per step:
 * - Completed steps: filled primary color
 * - Active step (stepIndex): filled + ring-2 ring-primary
 * - Future steps: muted/outlined
 *
 * Each dot has role="img" and aria-label="Langkah N" for screen readers.
 * Minimum dot size is 12×12px (min-w-3 min-h-3 in Tailwind).
 *
 * Validates: Requirements 9.4
 */
export function StepProgressBar({ stepIndex, totalSteps }: StepProgressBarProps) {
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Langkah ${stepIndex + 1} dari ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const isCompleted = i < stepIndex;
        const isActive = i === stepIndex;
        const stepNumber = i + 1;

        return (
          <span
            key={i}
            role="img"
            aria-label={`Langkah ${stepNumber}`}
            className={cn(
              // Minimum 12×12px
              "inline-block min-w-3 min-h-3 w-3 h-3 rounded-full transition-all duration-200",
              // Active step: filled + ring
              isActive && "bg-primary ring-2 ring-primary ring-offset-1",
              // Completed step: filled, no ring
              isCompleted && !isActive && "bg-primary opacity-60",
              // Future step: outlined/muted
              !isActive && !isCompleted && "bg-muted border border-muted-foreground/30"
            )}
          />
        );
      })}
    </div>
  );
}
