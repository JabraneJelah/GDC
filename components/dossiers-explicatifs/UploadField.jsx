'use client'

import { Upload, FileText } from 'lucide-react'

export function UploadField({ label, accept, selectedFile, onChange, helperText, id, disabled }) {
  const inputId = id ?? `upload-${label}`

  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-right text-sm font-semibold text-slate-700">{label}</p>
      )}
      <label
        htmlFor={inputId}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-5 text-center transition-colors ${
          selectedFile
            ? 'border-blue-300 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
        } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      >
        {selectedFile ? (
          <FileText className="size-7 text-blue-500" strokeWidth={1.5} />
        ) : (
          <Upload className="size-7 text-slate-400" strokeWidth={1.5} />
        )}
        {selectedFile ? (
          <span className="text-sm font-medium text-blue-700" dir="ltr">
            {selectedFile.name}
          </span>
        ) : (
          <>
            <span className="text-sm font-medium text-slate-700">اختر ملفا أو اسحبه هنا</span>
            {helperText && (
              <span className="text-xs text-slate-400">{helperText}</span>
            )}
          </>
        )}
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={onChange}
          className="sr-only"
          disabled={disabled}
        />
      </label>
    </div>
  )
}
