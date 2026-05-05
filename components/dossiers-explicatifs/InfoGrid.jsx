'use client'

export function InfoGrid({ items = [] }) {
  const valid = items.filter((item) => item.value)
  if (!valid.length) return null

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {valid.map((item) => (
        <div key={item.label} className="text-right">
          <p className="text-xs font-medium text-slate-500">{item.label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{item.value}</p>
        </div>
      ))}
    </div>
  )
}
