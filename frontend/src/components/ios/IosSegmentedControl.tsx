import React from 'react'
import { cn } from '@/lib/utils'

interface Option<T> {
  value: T
  label: string
}

interface IosSegmentedControlProps<T> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function IosSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: IosSegmentedControlProps<T>) {
  return (
    <div className={cn('bg-slate-200/80 dark:bg-zinc-800/80 p-1 rounded-xl flex items-center gap-1', className)}>
      {options.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150',
              isActive
                ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
export default IosSegmentedControl