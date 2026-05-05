'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Footer } from '@/components/layout/footer'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { InfoGrid } from '@/components/dossiers-explicatifs/InfoGrid'

const initialFormData = {
  type_faute_id: '',
  date_faute: '',
  details: '',
}

function PageShell({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col lg:ml-0">
        <main className="flex-1 bg-slate-50 pt-16 lg:pt-4">
          <div className="w-full px-6 py-6 lg:px-8">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}

function getProfesseurName(professeur) {
  if (!professeur) return ''
  return `${professeur.prenom || ''} ${professeur.nom || ''}`.trim()
}

function StepIndicator({ activeStep }) {
  const steps = [
    { number: 1, label: 'اختيار الموظف' },
    { number: 2, label: 'معلومات المخالفة' },
  ]

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {steps.map((step, index) => {
        const isActive = step.number === activeStep
        const isDone = step.number < activeStep

        return (
          <div key={step.number} className="flex items-center gap-2">
            <div className={`flex items-center gap-2.5 ${isActive || isDone ? 'text-blue-600' : 'text-slate-400'}`}>
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : isDone
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isDone ? '✓' : step.number}
              </span>
              <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : isDone ? 'text-blue-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`mx-3 h-px w-12 transition-colors ${isDone || isActive ? 'bg-blue-300' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
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

  const activeStep = selectedProfesseur ? 2 : 1

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
      const payload = {
        professeur_id: selectedProfesseur.id,
        type_faute_id: parseInt(formData.type_faute_id, 10),
        date_faute: formData.date_faute,
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
      <div className="space-y-6" dir="rtl">

        {/* Page header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-right">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                إنشاء ملف توضيحي جديد
              </h1>
              <p className="text-sm leading-relaxed text-slate-500">
                اختيار الموظف ثم إدخال معلومات المخالفة
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full text-slate-600 sm:w-auto"
              onClick={() => router.push('/dossiers-explicatifs')}
            >
              رجوع
            </Button>
          </div>
        </section>

        {/* Step indicator */}
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <StepIndicator activeStep={activeStep} />
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

        {/* Step 1 — Employee selection */}
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                1
              </span>
              <CardTitle className="text-right text-lg font-semibold text-slate-900">
                اختيار الموظف
              </CardTitle>
            </div>
            <p className="pt-1 text-right text-sm text-slate-500">
              ابحث عن الموظف بالاسم أو رقم التأجير ثم اختر السجل المناسب
            </p>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {!selectedProfesseur ? (
              <div className="space-y-3">
                <Label htmlFor="professeur-search" className="block text-right text-sm font-medium text-slate-700">
                  البحث عن الموظف
                </Label>
                <Input
                  id="professeur-search"
                  value={professeurSearch}
                  onChange={(event) => setProfesseurSearch(event.target.value)}
                  placeholder="البحث عن الموظف (الاسم، رقم التأجير...)"
                  className="h-11 rounded-xl border-slate-300 bg-white text-right text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500"
                  autoComplete="off"
                />
                {formErrors.professeur_id ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formErrors.professeur_id}
                  </p>
                ) : null}

                {/* Employee list */}
                <div className="max-h-72 space-y-2 overflow-auto">
                  {filteredProfesseurs.length > 0 ? (
                    filteredProfesseurs.map((professeur) => (
                      <button
                        key={professeur.id}
                        type="button"
                        onClick={() => handleSelectProfesseur(professeur)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-right transition-all hover:border-blue-400 hover:bg-blue-50"
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
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                      لا توجد نتائج
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <span className="size-1.5 rounded-full bg-blue-500" />
                    تم اختيار الموظف
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-slate-600"
                    onClick={() => {
                      setSelectedProfesseur(null)
                      setProfesseurSearch('')
                    }}
                  >
                    تغيير الموظف
                  </Button>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <InfoGrid
                    items={[
                      { label: 'الاسم الكامل', value: getProfesseurName(selectedProfesseur) || '-' },
                      { label: 'رقم التأجير', value: selectedProfesseur.ppr || '-' },
                      { label: 'الدرجة', value: selectedProfesseur.grade?.nom || '-' },
                      { label: 'المصلحة', value: selectedProfesseur.service?.nom || '-' },
                      { label: 'المستشفى', value: selectedProfesseur.hopital?.nom },
                      { label: 'التخصص', value: selectedProfesseur.specialite?.nom },
                    ]}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2 — Violation info — disabled until employee is selected */}
        <div className={`transition-opacity duration-200 ${!selectedProfesseur ? 'pointer-events-none opacity-40' : ''}`}>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${selectedProfesseur ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  2
                </span>
                <CardTitle className="text-right text-lg font-semibold text-slate-900">
                  معلومات المخالفة
                </CardTitle>
              </div>
              <p className="pt-1 text-right text-sm text-slate-500">
                أدخل المعطيات الخاصة بالملف بعد التأكد من الموظف المختار
              </p>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type_faute_id" className="block text-right text-sm font-medium text-slate-700">
                      نوع المخالفة <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.type_faute_id}
                      onValueChange={(value) => handleFormChange('type_faute_id', value)}
                    >
                      <SelectTrigger id="type_faute_id" className="h-11 rounded-xl border-slate-300 bg-white text-right">
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

                  <div className="space-y-2">
                    <Label htmlFor="date_faute" className="block text-right text-sm font-medium text-slate-700">
                      تاريخ المخالفة <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="date_faute"
                      type="date"
                      value={formData.date_faute}
                      onChange={(event) => handleFormChange('date_faute', event.target.value)}
                      className="h-11 rounded-xl border-slate-300 bg-white text-right"
                    />
                    {formErrors.date_faute ? (
                      <p className="text-sm text-red-600">{formErrors.date_faute}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details" className="block text-right text-sm font-medium text-slate-700">
                    تفاصيل إضافية
                  </Label>
                  <textarea
                    id="details"
                    value={formData.details}
                    onChange={(event) => handleFormChange('details', event.target.value)}
                    placeholder="ملاحظات أو تفاصيل إضافية حول المخالفة..."
                    className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
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
                    disabled={submitting}
                    className="w-full bg-blue-600 font-semibold text-white hover:bg-blue-700 sm:w-auto"
                  >
                    {submitting ? 'جاري الحفظ...' : 'حفظ الملف'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

      </div>
    </PageShell>
  )
}
