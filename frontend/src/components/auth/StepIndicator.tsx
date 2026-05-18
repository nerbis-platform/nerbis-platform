// src/components/auth/StepIndicator.tsx
// Step progress indicator for multi-step registration forms.

import type { StepIndicatorProps } from './types';

export function StepIndicator({
  currentStep,
  totalSteps = 2,
}: StepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <nav aria-label="Progreso del registro" data-auth-animated>
      <ol className="flex items-center gap-2">
        {steps.map((step) => {
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;

          return (
            <li
              key={step}
              aria-current={isActive ? 'step' : undefined}
              className="flex items-center gap-2"
            >
              {/* Dot indicator */}
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full transition-[background-color,transform] duration-[var(--auth-duration-normal)] ease-out ${
                  isActive
                    ? 'bg-[var(--auth-primary)] scale-110'
                    : isCompleted
                      ? 'bg-[var(--auth-success)]'
                      : 'bg-[var(--auth-border)]'
                }`}
                aria-hidden="true"
              />

              {/* Screen reader text */}
              <span className="sr-only">
                {isCompleted
                  ? `Paso ${step} de ${totalSteps}: completado`
                  : isActive
                    ? `Paso ${step} de ${totalSteps}: actual`
                    : `Paso ${step} de ${totalSteps}: pendiente`}
              </span>

              {/* Connecting line (not after last step) */}
              {step < totalSteps && (
                <span
                  className={`inline-block h-0.5 w-6 rounded-full transition-colors duration-[var(--auth-duration-normal)] ease-out ${
                    isCompleted
                      ? 'bg-[var(--auth-success)]'
                      : 'bg-[var(--auth-border)]'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Visible step label */}
      <p
        className="mt-1.5 text-[0.8125rem] text-[var(--auth-text-muted)]"
        style={{ fontFamily: 'var(--auth-font-body)' }}
        aria-live="polite"
      >
        Paso {currentStep} de {totalSteps}
      </p>
    </nav>
  );
}
