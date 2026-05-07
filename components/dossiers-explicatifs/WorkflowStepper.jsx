'use client'

import { Check } from 'lucide-react'

export function WorkflowStepper({ steps, currentStepIndex, viewedStepIndex, onStepClick }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="overflow-x-auto">
        <div className="flex min-w-[620px] items-start" dir="rtl">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex
            const isCurrent   = index === currentStepIndex
            const isViewed    = index === viewedStepIndex
            const isClickable = isCompleted || isCurrent

            return (
              <div key={step.label} className="flex flex-1 items-start">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(index)}
                  disabled={!isClickable}
                  className={`group flex min-w-[80px] flex-col items-center text-center ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {/* Circle */}
                  <span
                    className={`flex size-8 items-center justify-center rounded-full border transition-colors ${
                      isCompleted
                        ? 'border-emerald-500 bg-emerald-500 text-white group-hover:border-emerald-600 group-hover:bg-emerald-600'
                        : isCurrent
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-white text-slate-400'
                    } ${isViewed && !isCurrent ? 'ring-1 ring-blue-300 ring-offset-1' : ''}`}
                  >
                    {isCompleted
                      ? <Check className="size-4 stroke-2" />
                      : <span className="text-xs font-semibold">{index + 1}</span>
                    }
                  </span>

                  {/* Step label */}
                  <p
                    className={`mt-2 whitespace-nowrap text-xs font-semibold leading-tight transition-colors ${
                      isCompleted
                        ? 'text-slate-600 group-hover:text-emerald-700'
                        : isCurrent
                          ? 'text-blue-700'
                          : 'text-slate-400'
                    } ${isViewed ? 'underline decoration-dotted underline-offset-2' : ''}`}
                  >
                    {step.label}
                  </p>

                  {/* Step state label */}
                  <p className={`mt-0.5 text-[11px] leading-tight ${
                    isCompleted ? 'text-slate-400' : isCurrent ? 'text-blue-400' : 'text-slate-300'
                  }`}>
                    {isCompleted ? 'مكتملة' : isCurrent ? 'الحالية' : 'قادمة'}
                  </p>
                </button>

                {/* Connector */}
                {index < steps.length - 1 && (
                  <div className={`mx-1 mt-4 h-px flex-1 ${
                    index < currentStepIndex ? 'bg-emerald-300' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
