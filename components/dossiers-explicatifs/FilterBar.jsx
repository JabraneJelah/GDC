'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react'

const typeFauteArabicLabels = {
  RETARD: 'التأخر عن العمل',
  ABSENCE_NON_JUSTIFIEE: 'الغياب غير المبرر',
  DEPART_AVANT_HEURE: 'مغادرة العمل قبل الوقت',
  NON_RESPECT_PAUSE: 'عدم احترام أوقات الاستراحة',
  MAUVAISE_CONDUITE_PATIENTS: 'سوء التعامل مع المرضى',
  NON_RESPECT_COLLEGUES: 'عدم احترام الرؤساء أو الزملاء',
  ALTERCATION_TRAVAIL: 'الشجار داخل العمل',
  NON_RESPECT_ETHIQUE: 'عدم الالتزام بآداب المهنة',
  TENUE_PROFESSIONNELLE: 'الهندام المهني',
  ABANDON_POSTE: 'التخلي عن الوظيفة',
  CERTIFICAT_MEDICAL_HORS_DELAI: 'الإدلاء بشهادة طبية خارج الآجال',
  AZS: 'عطلة مرضية غير مبررة',
  CONGE_MALADIE_NON_JUSTIFIE: 'عطلة مرضية غير مبررة',
}

/**
 * Shared filter bar for dossiers-explicatifs list pages.
 *
 * Props:
 *  filters        – current filter values object
 *  defaultFilters – "reset" values; drives active-count + chip resets
 *  onFilterChange – (key, value) => void
 *  onClearFilters – () => void
 *  isOpen         – boolean
 *  onToggle       – () => void
 *  resultCount    – number shown in "عرض النتائج (N)" button
 *  uniqueServices – string[]
 *  uniqueHopitaux – string[]
 *  typesFaute     – { id, code, nom }[]
 *  statusOptions  – array of { value, label } | null (null = hide status filter entirely)
 */
export function FilterBar({
  filters,
  defaultFilters,
  onFilterChange,
  onClearFilters,
  isOpen,
  onToggle,
  resultCount,
  uniqueServices = [],
  uniqueHopitaux = [],
  typesFaute = [],
  statusOptions,
}) {
  const showStatus = statusOptions != null

  const activeFilterCount = useMemo(
    () => Object.keys(defaultFilters).filter((k) => filters[k] !== defaultFilters[k]).length,
    [filters, defaultFilters],
  )

  const filterChips = useMemo(() => {
    const chips = []
    if ('search' in defaultFilters && filters.search)
      chips.push({ key: 'search', label: `البحث: ${filters.search}` })
    if ('service' in defaultFilters && filters.service)
      chips.push({ key: 'service', label: `المصلحة: ${filters.service}` })
    if ('hopital' in defaultFilters && filters.hopital)
      chips.push({ key: 'hopital', label: `المستشفى: ${filters.hopital}` })
    if ('typeFauteId' in defaultFilters && filters.typeFauteId) {
      const tf = typesFaute.find((t) => String(t.id) === filters.typeFauteId)
      chips.push({ key: 'typeFauteId', label: `نوع المخالفة: ${tf ? (typeFauteArabicLabels[tf.code] || tf.nom) : filters.typeFauteId}` })
    }
    if ('status' in defaultFilters && filters.status !== defaultFilters.status) {
      const opt = (statusOptions || []).find((o) => o.value === filters.status)
      chips.push({ key: 'status', label: opt?.label || filters.status })
    }
    if ('dateFrom' in defaultFilters && filters.dateFrom)
      chips.push({ key: 'dateFrom', label: `من: ${filters.dateFrom}` })
    if ('dateTo' in defaultFilters && filters.dateTo)
      chips.push({ key: 'dateTo', label: `إلى: ${filters.dateTo}` })
    return chips
  }, [filters, defaultFilters, typesFaute, statusOptions])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Toggle header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 sm:px-6"
      >
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="size-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-800">البحث والتصفية</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        {isOpen
          ? <ChevronUp className="size-4 text-slate-400" />
          : <ChevronDown className="size-4 text-slate-400" />
        }
      </button>

      {/* Active chips when collapsed */}
      {!isOpen && filterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 pb-4 pt-3 sm:px-6">
          {filterChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-blue-700"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => onFilterChange(chip.key, defaultFilters[chip.key])}
                className="flex size-3.5 items-center justify-center rounded-full bg-blue-200 text-blue-700 hover:bg-blue-300"
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs text-slate-400 underline hover:text-slate-600"
          >
            مسح الكل
          </button>
        </div>
      )}

      {/* Expanded filter form */}
      {isOpen && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 sm:px-6">
          <div className="space-y-4">
            {/* Row 1: search, service, hopital */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="block text-right text-xs font-semibold text-slate-600">بحث عام</label>
                <Input
                  value={filters.search}
                  onChange={(e) => onFilterChange('search', e.target.value)}
                  placeholder="الاسم، رقم التأجير، المرجع..."
                  className="h-9 rounded-xl border-slate-300 bg-white text-right text-sm placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-right text-xs font-semibold text-slate-600">المصلحة</label>
                <Select
                  value={filters.service || '__all__'}
                  onValueChange={(v) => onFilterChange('service', v === '__all__' ? '' : v)}
                >
                  <SelectTrigger className="h-9 rounded-xl border-slate-300 bg-white text-right text-sm">
                    <SelectValue placeholder="كل المصالح" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">كل المصالح</SelectItem>
                    {uniqueServices.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-right text-xs font-semibold text-slate-600">المستشفى</label>
                <Select
                  value={filters.hopital || '__all__'}
                  onValueChange={(v) => onFilterChange('hopital', v === '__all__' ? '' : v)}
                >
                  <SelectTrigger className="h-9 rounded-xl border-slate-300 bg-white text-right text-sm">
                    <SelectValue placeholder="كل المستشفيات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">كل المستشفيات</SelectItem>
                    {uniqueHopitaux.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: typeFaute, (status), dateFrom, dateTo */}
            <div className={`grid gap-3 ${showStatus ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
              <div className="space-y-1.5">
                <label className="block text-right text-xs font-semibold text-slate-600">نوع المخالفة</label>
                <Select
                  value={filters.typeFauteId || '__all__'}
                  onValueChange={(v) => onFilterChange('typeFauteId', v === '__all__' ? '' : v)}
                >
                  <SelectTrigger className="h-9 rounded-xl border-slate-300 bg-white text-right text-sm">
                    <SelectValue placeholder="كل الأنواع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">كل الأنواع</SelectItem>
                    {typesFaute.map((tf) => (
                      <SelectItem key={tf.id} value={String(tf.id)}>
                        {typeFauteArabicLabels[tf.code] || tf.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showStatus && (
                <div className="space-y-1.5">
                  <label className="block text-right text-xs font-semibold text-slate-600">الحالة</label>
                  <Select value={filters.status} onValueChange={(v) => onFilterChange('status', v)}>
                    <SelectTrigger className="h-9 rounded-xl border-slate-300 bg-white text-right text-sm">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-right text-xs font-semibold text-slate-600">من تاريخ</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                  className="h-9 rounded-xl border-slate-300 bg-white text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-right text-xs font-semibold text-slate-600">إلى تاريخ</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => onFilterChange('dateTo', e.target.value)}
                  className="h-9 rounded-xl border-slate-300 bg-white text-sm"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-500">
                عرض{' '}
                <span className="font-semibold text-slate-800">{resultCount}</span>{' '}
                نتيجة
              </span>
              <div className="flex gap-2">
                {activeFilterCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClearFilters}
                    className="h-8 gap-1.5 text-slate-600"
                  >
                    <X className="size-3.5" />
                    مسح الفلاتر
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={onToggle}
                >
                  عرض النتائج ({resultCount})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
