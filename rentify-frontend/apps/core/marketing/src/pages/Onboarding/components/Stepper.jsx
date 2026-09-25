import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@rentify/utils';

// `vertical` is used in the desktop sidebar, `compact` in the mobile header.
// Only completed steps are clickable, so users can go back but not skip ahead.
const Stepper = ({ steps, currentStep, onStepClick, variant = 'vertical' }) => {
  if (variant === 'compact') {
    const progress = (currentStep / steps.length) * 100;

    return (
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={currentStep}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  }

  return (
    <ol className="space-y-1" aria-label="Progress">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = currentStep > stepNumber;
        const isActive = currentStep === stepNumber;
        const isLast = stepNumber === steps.length;
        const Icon = step.icon;

        return (
          <li key={step.id} className="relative">
            {!isLast && (
              <span
                className={cn(
                  'absolute left-[1.4rem] top-12 h-[calc(100%-2.5rem)] w-0.5 rounded-full transition-colors',
                  isCompleted ? 'bg-primary' : 'bg-border'
                )}
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={() => isCompleted && onStepClick?.(stepNumber)}
              disabled={!isCompleted}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'flex w-full items-start gap-4 rounded-xl p-2 text-left transition-colors',
                isCompleted && 'hover:bg-muted',
                isActive && 'bg-primary/5',
                !isCompleted && 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                  isCompleted &&
                    'border-primary bg-primary text-primary-foreground',
                  isActive &&
                    'border-primary bg-background text-primary ring-4 ring-primary/15',
                  !isCompleted &&
                    !isActive &&
                    'border-border bg-background text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>
              <span className="pt-1">
                <span
                  className={cn(
                    'block text-sm font-semibold',
                    isActive || isCompleted
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {step.description}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
};

export default Stepper;
