'use client'

import { Check } from 'lucide-react'

// Horizontal depth (px) of each chevron arrow/notch
const A = 13

function chevronClip(isFirst, isLast) {
  if (isFirst && isLast) return undefined
  if (isFirst)
    // rightmost: flat right edge, left-pointing arrow
    return `polygon(100% 0%, ${A}px 0%, 0% 50%, ${A}px 100%, 100% 100%)`
  if (isLast)
    // leftmost: right-side notch, flat left edge
    return `polygon(calc(100% - ${A}px) 0%, 0% 0%, 0% 100%, calc(100% - ${A}px) 100%, 100% 50%)`
  // middle: right-side notch + left-pointing arrow
  return `polygon(calc(100% - ${A}px) 0%, ${A}px 0%, 0% 50%, ${A}px 100%, calc(100% - ${A}px) 100%, 100% 50%)`
}

export function WorkflowStepper({ steps, currentStepIndex, viewedStepIndex, onStepClick }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 shadow-sm">
      <div className="overflow-x-auto">
        <div className="flex min-w-[560px] gap-0.5" dir="rtl">
          {steps.map((step, index) => {
            const isFirst     = index === 0
            const isLast      = index === steps.length - 1
            const isCompleted = index < currentStepIndex
            const isCurrent   = index === currentStepIndex
            const isViewed    = index === viewedStepIndex
            const isClickable = isCompleted || isCurrent

            const clip = chevronClip(isFirst, isLast)

            // Padding accounts for the clipped area on each side
            const pl = isFirst ? 10 : A + 7
            const pr = isLast  ? 10 : A + 7

            const bg = isCompleted ? '#ecfdf5'   // emerald-50
                     : isCurrent   ? '#eff6ff'   // blue-50
                     :               '#f1f5f9'   // slate-100

            const labelColor = isCompleted ? '#065f46'   // emerald-900
                             : isCurrent   ? '#1e40af'   // blue-800
                             :               '#94a3b8'   // slate-400

            const numColor = isCurrent ? '#3b82f6' : '#cbd5e1' // blue-500 / slate-300

            return (
              <button
                key={step.label}
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                style={{
                  clipPath: clip,
                  paddingLeft: `${pl}px`,
                  paddingRight: `${pr}px`,
                  backgroundColor: bg,
                }}
                className={[
                  'group relative flex flex-1 items-center justify-center gap-1.5 py-2.5 transition-[filter]',
                  isClickable ? 'cursor-pointer hover:brightness-[0.96]' : 'cursor-default',
                ].join(' ')}
              >
                {/* Step icon / number */}
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {isCompleted ? (
                    <Check className="size-3.5 stroke-[2.5] text-emerald-500" />
                  ) : (
                    <span
                      style={{ color: numColor }}
                      className="text-[11px] font-bold tabular-nums leading-none"
                    >
                      {index + 1}
                    </span>
                  )}
                </span>

                {/* Step label */}
                <span
                  style={{ color: labelColor }}
                  className={[
                    'whitespace-nowrap text-[12px] font-semibold leading-none',
                    isViewed && !isCurrent ? 'underline decoration-dotted underline-offset-2' : '',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
