'use client'

import { Check } from 'lucide-react'

export function WorkflowStepper({ steps, currentStepIndex, viewedStepIndex, onStepClick }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[860px] items-start" dir="rtl">
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
                  className={`group flex min-w-[100px] flex-col items-center text-center transition-all duration-200 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {/* Circle */}
                  <span
                    className={`relative flex size-10 items-center justify-center rounded-full border-2 font-bold transition-all duration-200 ${
                      isCompleted
                        ? 'border-green-500 bg-green-500 text-white shadow-sm group-hover:scale-110 group-hover:shadow-md'
                        : isCurrent
                          ? 'border-blue-600 bg-blue-600 text-white shadow-lg ring-4 ring-blue-100'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                    } ${isViewed && !isCurrent ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
                  >
                    {isCompleted
                      ? <Check className="size-5 stroke-[2.5]" />
                      : <span className="text-sm font-bold">{index + 1}</span>
                    }
                    {isCurrent && (
                      <span className="absolute -inset-1.5 animate-ping rounded-full bg-blue-400 opacity-25" />
                    )}
                  </span>

                  {/* Label */}
                  <p
                    className={`mt-2.5 whitespace-nowrap text-[13px] font-semibold leading-tight transition-all duration-200 ${
                      isCompleted
                        ? 'text-slate-700 group-hover:text-green-700'
                        : isCurrent
                          ? 'text-blue-700'
                          : 'text-slate-400'
                    } ${isViewed ? 'underline decoration-dotted underline-offset-2' : ''}`}
                  >
                    {step.label}
                  </p>

                  {/* Sub-label */}
                  <p className={`mt-0.5 text-[10px] font-medium tracking-wide ${
                    isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-500' : 'text-slate-300'
                  }`}>
                    {isCompleted ? 'مكتملة' : isCurrent ? 'الحالية' : 'قادمة'}
                  </p>
                </button>

                {/* Connector */}
                {index < steps.length - 1 && (
                  <div className={`mx-1 mt-5 h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                    index < currentStepIndex - 1
                      ? 'bg-green-400'
                      : index === currentStepIndex - 1
                        ? 'bg-gradient-to-l from-blue-500 to-green-400'
                        : index === currentStepIndex
                          ? 'bg-gradient-to-l from-slate-200 to-blue-300'
                          : 'bg-slate-200'
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
