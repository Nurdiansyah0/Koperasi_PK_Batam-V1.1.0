import React, { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IosListSectionProps {
  title?: string
  footer?: string
  children: ReactNode
  className?: string
}

export function IosListSection({ title, footer, children, className }: IosListSectionProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {title && (
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4">
          {title}
        </p>
      )}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/80 border border-slate-200/50 dark:border-zinc-800/50">
        {children}
      </div>
      {footer && (
        <p className="text-xs text-slate-400 dark:text-slate-500 px-4 mt-1">
          {footer}
        </p>
      )}
    </div>
  )
}

interface IosListItemProps {
  icon?: ReactNode
  iconBgColor?: string
  title: string
  subtitle?: string
  value?: ReactNode
  hasChevron?: boolean
  onClick?: () => void
  destructive?: boolean
}

export function IosListItem({
  icon,
  iconBgColor = 'bg-blue-600',
  title,
  subtitle,
  value,
  hasChevron = false,
  onClick,
  destructive = false,
}: IosListItemProps) {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between p-3.5 sm:p-4 text-left transition-colors',
        onClick && 'hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-zinc-800/50 dark:active:bg-zinc-800 cursor-pointer'
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {icon && (
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs', iconBgColor)}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className={cn('text-sm font-semibold tracking-tight truncate', destructive ? 'text-rose-600' : 'text-slate-900 dark:text-white')}>
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        {value && <div className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">{value}</div>}
        {hasChevron && <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
      </div>
    </Component>
  )
}