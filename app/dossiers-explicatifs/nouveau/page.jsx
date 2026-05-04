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
        <main className="flex-1 pt-16 lg:pt-4">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
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
        <div className="flex min-h-[400px] items-center justify-center text-slate-600" dir="rtl">
          جاري تحميل المعطيات...
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="space-y-6" dir="rtl">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5 text-right">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                إنشاء ملف توضيحي جديد
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-500">
                اختيار الموظف ثم إدخال معلومات المخالفة
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => router.push('/dossiers-explicatifs')}
            >
              رجوع
            </Button>
          </div>
        </section>

        {successMessage ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-right text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-right text-base text-slate-700">
              اختيار الموظف
            </CardTitle>
            <p className="text-right text-sm text-slate-500">
              ابحث عن الموظف بالاسم أو رقم التأجير ثم اختر السجل المناسب
            </p>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {!selectedProfesseur ? (
              <div className="space-y-2">
                <Label htmlFor="professeur-search" className="block text-right text-sm font-medium text-slate-700">
                  البحث عن الموظف
                </Label>
                <Input
                  id="professeur-search"
                  value={professeurSearch}
                  onChange={(event) => setProfesseurSearch(event.target.value)}
                  placeholder="البحث عن الموظف (الاسم، رقم التأجير...)"
                  className="h-11 text-right"
                  autoComplete="off"
                />
                {formErrors.professeur_id ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formErrors.professeur_id}</p>
                ) : null}
                <div className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white">
                  {filteredProfesseurs.length > 0 ? (
                    filteredProfesseurs.map((professeur) => (
                      <button
                        key={professeur.id}
                        type="button"
                        onClick={() => handleSelectProfesseur(professeur)}
                        className="block w-full border-b border-slate-100 px-4 py-3.5 text-right transition-colors hover:bg-slate-50 last:border-b-0"
                      >
                        <span className="block font-medium text-slate-800">
                          {getProfesseurName(professeur) || '-'}
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                          {professeur.ppr || '-'} · {professeur.grade?.nom || '-'} · {professeur.service?.nom || '-'}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-slate-500">
                      لا توجد نتائج
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-blue-700">
                    تم اختيار الموظف
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProfesseur(null)
                      setProfesseurSearch('')
                    }}
                  >
                    تغيير الموظف
                  </Button>
                </div>
                <div className="grid gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">الاسم الكامل</p>
                    <p className="font-medium text-slate-800">{getProfesseurName(selectedProfesseur) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">رقم التأجير</p>
                    <p className="font-medium text-slate-800">{selectedProfesseur.ppr || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">الدرجة</p>
                    <p className="font-medium text-slate-800">{selectedProfesseur.grade?.nom || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">المصلحة</p>
                    <p className="font-medium text-slate-800">{selectedProfesseur.service?.nom || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">المستشفى</p>
                    <p className="font-medium text-slate-800">{selectedProfesseur.hopital?.nom || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">التخصص</p>
                    <p className="font-medium text-slate-800">{selectedProfesseur.specialite?.nom || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-right text-base text-slate-700">
              معلومات المخالفة
            </CardTitle>
            <p className="text-right text-sm text-slate-500">
              أدخل المعطيات الخاصة بالملف بعد التأكد من الموظف المختار
            </p>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type_faute_id" className="block text-right text-sm font-medium text-slate-700">
                    نوع المخالفة <span className="text-red-600">*</span>
                  </Label>
                  <Select
                    value={formData.type_faute_id}
                    onValueChange={(value) => handleFormChange('type_faute_id', value)}
                  >
                    <SelectTrigger id="type_faute_id" className="h-11 text-right">
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
                    تاريخ المخالفة <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="date_faute"
                    type="date"
                    value={formData.date_faute}
                    onChange={(event) => handleFormChange('date_faute', event.target.value)}
                    className="h-11 text-right"
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
                  className="min-h-32 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-right text-sm text-slate-700 shadow-xs outline-none transition-colors placeholder:text-slate-400 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dossiers-explicatifs')}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? 'جاري الحفظ...' : 'حفظ الملف'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
