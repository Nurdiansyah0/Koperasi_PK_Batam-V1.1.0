import React, { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputRupiahProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  error?: string
  value: string | number
  onChange: (rawValue: string) => void
}

export function InputRupiah({ label, error, className, value, onChange, ...props }: InputRupiahProps) {
  // Format the display value (add dots)
  const displayValue = value !== undefined && value !== null && value !== ''
    ? value.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip everything except digits
    const rawValue = e.target.value.replace(/\D/g, '')
    onChange(rawValue) // Pass raw numeric string to parent
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label} {props.required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-slate-500 sm:text-sm font-medium">Rp</span>
        </div>
        <input
          type="text"
          inputMode="numeric"
          className={cn(
            "w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all",
            error && "border-rose-500 focus:ring-rose-500 focus:border-rose-500",
            className
          )}
          value={displayValue}
          onChange={handleChange}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-rose-500">{error}</p>}
    </div>
  )
}
