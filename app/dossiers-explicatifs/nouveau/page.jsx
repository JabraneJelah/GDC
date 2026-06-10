'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, User } from 'lucide-react'

const initialFormData = {
  type_faute_id: '',
  date_faute: '',
  heure_faute: '',
  details: '',
}

function getProfesseurName(professeur) {
  if (!professeur) return ''
  return `${professeur.prenom || ''} ${professeur.nom || ''}`.trim()
}

export default function NouveauDossierExplicatifPage() {
  const router = useRouter()
  const [professeurs, setProfesseurs] = useState([])
  const [typesFaute, setTypesFaute] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [professeurSearch, setProfesseurSearch] = useState('')
  const [selectedProfesseur, setSelectedProfesseur] = useState(null)
  const [formData, setFormData] = useState(initialFormData)
  const [formErrors, setFormErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [professeursResponse, typesFauteResponse] = await Promise.all([
          fetch('/api/professeurs'),
          fetch('/api/type-faute'),
        ])

        if (professeursResponse.ok) {
          const data = await professeursResponse.json()
          setProfesseurs(Array.isArray(data) ? data : [])
        }

        if (typesFauteResponse.ok) {
          const data = await typesFauteResponse.json()
          const activeTypes = Array.isArray(data)
            ? data.filter((typeFaute) => typeFaute.actif !== false)
            : []
          setTypesFaute(activeTypes)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des donnees:', error)
        setErrorMessage('تعذر تحميل المعطيات')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredProfesseurs = useMemo(() => {
    const normalizedSearch = professeurSearch.trim().toLowerCase()
    if (!normalizedSearch) return professeurs.slice(0, 10)

    return professeurs
      .filter((professeur) => {
        const searchable = [
          professeur.nom,
          professeur.prenom,
          professeur.ppr,
          professeur.grade?.nom,
          professeur.service?.nom,
          professeur.hopital?.nom,
          professeur.specialite?.nom,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return searchable.includes(normalizedSearch)
      })
      .slice(0, 12)
  }, [professeurs, professeurSearch])

  const handleSelectProfesseur = (professeur) => {
    setSelectedProfesseur(professeur)
    setProfesseurSearch('')
    setFormErrors((current) => ({ ...current, professeur_id: '' }))
    setErrorMessage('')
  }

  const handleFormChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }))
    setFormErrors((current) => ({ ...current, [field]: '' }))
    setErrorMessage('')
  }

  const validateForm = () => {
    const errors = {}

    if (!selectedProfesseur) errors.professeur_id = 'المرجو اختيار الموظف'
    if (!formData.type_faute_id) errors.type_faute_id = 'المرجو اختيار نوع المخالفة'
    if (!formData.date_faute) errors.date_faute = 'المرجو إدخال تاريخ المخالفة'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!validateForm()) return

    setSubmitting(true)

    try {
      const dateTimeFaute = formData.heure_faute
        ? `${formData.date_faute}T${formData.heure_faute}:00`
        : formData.date_faute

      const payload = {
        professeur_id: selectedProfesseur.id,
        type_faute_id: parseInt(formData.type_faute_id, 10),
        date_faute: dateTimeFaute,
      }

      if (formData.details.trim()) {
        payload.details = formData.details.trim()
      }

      const response = await fetch('/api/dossiers-explicatifs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Create failed')
      }

      setSuccessMessage('تم إنشاء الملف بنجاح')
      setTimeout(() => {
        router.push('/dossiers-explicatifs')
      }, 700)
    } catch (error) {
      console.error('Erreur lors de la creation du dossier explicatif:', error)
      setErrorMessage('تعذر إنشاء الملف')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3" dir="rtl">
          <span className="size-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">جاري تحميل المعطيات...</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="w-full space-y-6" dir="rtl">

        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5 text-right">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">إنشاء ملف توضيحي جديد</h1>
            <p className="text-sm text-slate-500">اختيار الموظف ثم إدخال معلومات المخالفة</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 text-slate-600"
            onClick={() => router.push('/dossiers-explicatifs')}
          >
            رجوع
          </Button>
        </div>

        {/* Feedback */}
        {successMessage ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-right text-sm font-medium text-green-700">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {/* ── Section 1: Employee search ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              1
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">اختيار الموظف</h2>
              <p className="text-xs text-slate-500">ابحث بالاسم أو رقم التأجير ثم اختر السجل المناسب</p>
            </div>
          </div>

          <div className="p-5">
            {!selectedProfesseur ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input
                    id="professeur-search"
                    value={professeurSearch}
                    onChange={(event) => setProfesseurSearch(event.target.value)}
                    placeholder="البحث عن الموظف (الاسم، رقم التأجير...)"
                    className="h-11 rounded-xl border-slate-300 bg-white pr-10 text-right text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500"
                    autoComplete="off"
                  />
                </div>

                {formErrors.professeur_id ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formErrors.professeur_id}
                  </p>
                ) : null}

                <div className="max-h-80 space-y-1.5 overflow-auto">
                  {filteredProfesseurs.length > 0 ? (
                    filteredProfesseurs.map((professeur) => (
                      <button
                        key={professeur.id}
                        type="button"
                        onClick={() => handleSelectProfesseur(professeur)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-right transition-all hover:border-blue-400 hover:bg-blue-50"
                      >
                        <span className="block font-semibold text-slate-900">
                          {getProfesseurName(professeur) || '-'}
                        </span>
                        <span className="mt-0.5 block text-sm text-slate-500">
                          {professeur.ppr || '-'} · {professeur.grade?.nom || '-'} · {professeur.service?.nom || '-'}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
                      لا توجد نتائج
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Compact selected state — stays inside Section 1 */
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <User className="size-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{getProfesseurName(selectedProfesseur)}</p>
                    <p className="text-sm text-slate-500">
                      {selectedProfesseur.ppr || '-'} · {selectedProfesseur.grade?.nom || '-'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-slate-600"
                  onClick={() => {
                    setSelectedProfesseur(null)
                    setProfesseurSearch('')
                  }}
                >
                  تغيير
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 2: Selected employee summary (only when selected) ── */}
        {selectedProfesseur && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 px-5 py-4" dir="rtl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-600">الموظف المختار</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {[
                { label: 'الاسم الكامل', value: getProfesseurName(selectedProfesseur) },
                { label: 'رقم التأجير', value: selectedProfesseur.ppr || '-' },
                { label: 'الدرجة', value: selectedProfesseur.grade?.nom || '-' },
                { label: 'المصلحة', value: selectedProfesseur.service?.nom || '-' },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-xs text-slate-500">{item.label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* ── Section 3 + 4: Fault info + actions ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              2
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">معلومات المخالفة</h2>
              <p className="text-xs text-slate-500">أدخل المعطيات الخاصة بالمخالفة المسجّلة</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-5">
            {!selectedProfesseur && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm text-amber-700">
                يرجى اختيار الموظف أولاً لإدخال معلومات المخالفة
              </div>
            )}

            {/* نوع المخالفة */}
            <div className="space-y-2">
              <Label
                htmlFor="type_faute_id"
                className="block text-right text-sm font-medium text-slate-700"
              >
                نوع المخالفة <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.type_faute_id}
                onValueChange={(value) => handleFormChange('type_faute_id', value)}
                disabled={!selectedProfesseur}
              >
                <SelectTrigger
                  id="type_faute_id"
                  className="h-11 rounded-xl border-slate-300 bg-white text-right"
                >
                  <SelectValue placeholder="اختر نوع المخالفة" />
                </SelectTrigger>
                <SelectContent>
                  {typesFaute.map((typeFaute) => (
                    <SelectItem key={typeFaute.id} value={typeFaute.id.toString()}>
                      {typeFaute.nom || typeFaute.libelle || typeFaute.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.type_faute_id ? (
                <p className="text-sm text-red-600">{formErrors.type_faute_id}</p>
              ) : null}
            </div>

            {/* تاريخ + وقت */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="date_faute"
                  className="block text-right text-sm font-medium text-slate-700"
                >
                  تاريخ المخالفة <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date_faute"
                  type="date"
                  value={formData.date_faute}
                  onChange={(event) => handleFormChange('date_faute', event.target.value)}
                  disabled={!selectedProfesseur}
                  className="h-11 rounded-xl border-slate-300 bg-white text-right"
                />
                {formErrors.date_faute ? (
                  <p className="text-sm text-red-600">{formErrors.date_faute}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="heure_faute"
                  className="block text-right text-sm font-medium text-slate-700"
                >
                  وقت المخالفة
                </Label>
                <Input
                  id="heure_faute"
                  type="time"
                  value={formData.heure_faute}
                  onChange={(event) => handleFormChange('heure_faute', event.target.value)}
                  disabled={!selectedProfesseur}
                  className="h-11 rounded-xl border-slate-300 bg-white text-right"
                />
              </div>
            </div>

            {/* تفاصيل */}
            <div className="space-y-2">
              <Label
                htmlFor="details"
                className="block text-right text-sm font-medium text-slate-700"
              >
                تفاصيل إضافية
              </Label>
              <textarea
                id="details"
                value={formData.details}
                onChange={(event) => handleFormChange('details', event.target.value)}
                placeholder="ملاحظات أو تفاصيل إضافية حول المخالفة..."
                disabled={!selectedProfesseur}
                className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dossiers-explicatifs')}
                disabled={submitting}
                className="w-full text-slate-600 sm:w-auto"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={submitting || !selectedProfesseur}
                className="w-full bg-blue-600 font-semibold text-white hover:bg-blue-700 sm:w-auto"
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ الملف'}
              </Button>
            </div>
          </form>
        </div>

      </div>
    </PageShell>
  )
}
