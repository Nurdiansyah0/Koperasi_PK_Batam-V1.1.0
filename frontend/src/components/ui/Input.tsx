import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, required, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 shadow-xs transition-all duration-150',
              'focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-500/15',
              'disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
              icon && 'pl-10',
              error && 'border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500/15',
              className
            )}
            required={required}
            {...props}
          />
        </div>
        {error && <p className="text-xs font-medium text-rose-500 mt-1">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
export { Input }
