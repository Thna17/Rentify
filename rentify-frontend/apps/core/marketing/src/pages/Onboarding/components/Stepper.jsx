import React from "react";
import { Check } from "lucide-react";
import { cn } from "@rentify/utils";

const Stepper = ({ steps, currentStep, onStepClick }) => {
  const progress = steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="relative h-12">
        {/* Track */}
        <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-muted" />
        {/* Progress */}
        <div
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
      </div>

      {/* Nodes */}
      <ol
        className="relative grid pt-4"
        style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
        aria-label="Progress"
      >
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;
          const Icon = step.icon;

          return (
            <li key={step.id} className="flex flex-col items-center gap-3 text-center">
              <button
                type="button"
                onClick={() => onStepClick?.(index)}
                className={cn(
                  "hover-scale flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background transition-all duration-300 focus:outline-none focus:ring-4",
                  isCompleted && "border-primary bg-primary text-primary-foreground focus:ring-primary/30",
                  isActive && !isCompleted && "border-primary text-primary focus:ring-primary/30",
                  !isCompleted && !isActive && "border-muted-foreground/30 text-muted-foreground focus:ring-muted/20"
                )}
                aria-current={isActive ? "step" : undefined}
                aria-label={step.title}
              >
                {isCompleted ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
              </button>
              <p
                className={cn(
                  "text-xs font-semibold transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.title}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default Stepper;
