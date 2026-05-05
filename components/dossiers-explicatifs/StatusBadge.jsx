'use client'

const variantStyles = {
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  danger:  'bg-red-100 text-red-700 border-red-200',
  info:    'bg-blue-100 text-blue-700 border-blue-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  primary: 'bg-blue-600 text-white border-blue-600',
}

export function StatusBadge({ variant = 'neutral', children }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${variantStyles[variant] ?? variantStyles.neutral}`}
    >
      {children}
    </span>
  )
}
