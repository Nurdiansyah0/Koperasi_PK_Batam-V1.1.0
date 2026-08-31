import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(({ className, ...props }, ref) => (
  <div className="w-full overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
    <table ref={ref} className={cn('w-full caption-bottom text-sm border-collapse', className)} {...props} />
  </div>
))
Table.displayName = 'Table'

const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200/80 dark:border-slate-700', className)} {...props} />
))
TableHeader.displayName = 'TableHeader'

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right'
}

const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(({ className, align = 'left', ...props }, ref) => {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <th
      ref={ref}
      className={cn('h-11 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 align-middle', alignClass, className)}
      {...props}
    />
  )
})
TableHead.displayName = 'TableHead'

const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900', className)} {...props} />
))
TableBody.displayName = 'TableBody'

const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn('transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40', className)} {...props} />
))
TableRow.displayName = 'TableRow'

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  isHeader?: boolean
  align?: 'left' | 'center' | 'right'
}

const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(({ className, isHeader, align = 'left', ...props }, ref) => {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  if (isHeader) {
    return (
      <th
        ref={ref as any}
        className={cn('h-11 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 align-middle', alignClass, className)}
        {...props}
      />
    )
  }
  return (
    <td
      ref={ref}
      className={cn('p-4 align-middle text-slate-700 dark:text-slate-300 text-sm', alignClass, className)}
      {...props}
    />
  )
})
TableCell.displayName = 'TableCell'

export { Table, TableHeader, TableHead, TableBody, TableRow, TableCell }
