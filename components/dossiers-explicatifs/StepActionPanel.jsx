'use client'

export function StepActionPanel({ title, isCurrentStep, onReturnToCurrent, children }) {
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      {/* Panel header */}
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between" dir="rtl">
        <h2 className="flex-1 text-right text-lg font-bold text-slate-950">{title}</h2>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              isCurrentStep
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            <span className={`size-1.5 rounded-full ${isCurrentStep ? 'bg-blue-500' : 'bg-slate-400'}`} />
            {isCurrentStep ? 'المرحلة الحالية' : 'عرض المرحلة'}
          </span>
          {!isCurrentStep && onReturnToCurrent && (
            <button
              type="button"
              onClick={onReturnToCurrent}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              العودة للمرحلة الحالية
            </button>
          )}
        </div>
      </div>

      {children}
    </div>
  )
}
