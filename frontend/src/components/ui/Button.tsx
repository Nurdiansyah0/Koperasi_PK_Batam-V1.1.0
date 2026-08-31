import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] border border-blue-600/20',
      secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-[0.98] dark:bg-slate-800 dark:text-slate-200',
      danger: 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-sm hover:from-rose-600 hover:to-red-700 active:scale-[0.98]',
      success: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700 active:scale-[0.98]',
      outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-300',
    }
    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
      md: 'h-10 px-4 py-2 text-sm rounded-xl gap-2',
      lg: 'h-12 px-6 text-base rounded-xl gap-2.5 font-semibold',
      icon: 'h-10 w-10 p-0 rounded-xl justify-center',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
        "touch-manipulation",
          'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none cursor-pointer',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export { Button }
