import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 font-medium',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/60 font-medium',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/60 font-medium',
    info: 'bg-blue-50 text-blue-700 border-blue-200/60 font-medium',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/60 font-medium',
  }
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
