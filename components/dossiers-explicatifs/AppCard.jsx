'use client'

export function AppCard({ title, subtitle, icon: Icon, onIconClick, iconLoading, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || subtitle) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex-1 text-right">
            {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {Icon && onIconClick ? (
            <button
              type="button"
              onClick={onIconClick}
              disabled={iconLoading}
              title="تحميل الكل"
              className="shrink-0 cursor-pointer rounded-lg bg-slate-100 p-1.5 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {iconLoading ? (
                <span className="block size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
              ) : (
                <Icon className="size-4 text-slate-500" />
              )}
            </button>
          ) : Icon ? (
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5">
              <Icon className="size-4 text-slate-500" />
            </div>
          ) : null}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  )
}
