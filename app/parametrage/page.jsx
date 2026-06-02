'use client'

import { useEffect, useState } from 'react'
import { Settings, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ParametragePage() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/app-settings')
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => setError('تعذّر تحميل الإعدادات'))
  }, [])

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/app-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setSettings(updated)
      setSaved(true)
    } catch {
      setError('تعذّر حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  if (!settings) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3" dir="rtl">
        <span className="size-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-600" />
        <p className="text-sm text-gray-500">{error ?? 'جاري التحميل...'}</p>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-4">

      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">الإعدادات</h1>
            <p className="mt-0.5 text-sm text-slate-500">إعدادات التطبيق العامة</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1174BC]/10">
            <Settings className="h-5 w-5 text-[#1174BC]" />
          </div>
        </div>
      </div>

      {/* Feedback messages */}
      {saved && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-right text-sm text-green-700">
          تم حفظ الإعدادات بنجاح
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Settings card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-800">إعدادات التقويم</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            تحكم في أيام التقويم المتاحة للاختيار عند إنشاء رخصة. هذه الإعدادات لا تغير طريقة احتساب مدة الرخصة.
          </p>
        </div>

        <div className="divide-y divide-slate-100 px-6">
          <ToggleRow
            checked={settings.block_holiday_selection}
            onChange={() => handleToggle('block_holiday_selection')}
            label="منع اختيار أيام العطل الرسمية"
            description="هذا الخيار يمنع الاختيار في التقويم فقط، ولا يغير طريقة احتساب مدة الرخصة."
          />
          <ToggleRow
            checked={settings.block_weekend_selection}
            onChange={() => handleToggle('block_weekend_selection')}
            label="منع اختيار أيام نهاية الأسبوع"
            description="هذا الخيار يمنع الاختيار في التقويم فقط، ولا يغير طريقة احتساب مدة الرخصة."
          />
        </div>

        <div className="flex items-center justify-start border-t border-slate-100 px-6 py-4">
          <Button onClick={handleSave} disabled={saving} className="cursor-pointer gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed">
            <Save className="h-4 w-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Button>
        </div>
      </div>

    </div>
  )
}

function ToggleRow({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start gap-4 py-5">
      <div className="flex-1">
        <p className="font-medium text-slate-800">{label}</p>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1174BC] focus-visible:ring-offset-2 ${
          checked ? 'bg-[#1174BC]' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
            checked ? '-translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
