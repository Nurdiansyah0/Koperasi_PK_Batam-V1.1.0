const fs = require('fs');
const path = require('path');

const write = (filePath, content) => {
  const fullPath = path.join(__dirname, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim());
  console.log(`Created ${filePath}`);
};

write('src/components/ios/IosMemberCard.tsx', `
import React from 'react'
import { formatRupiah } from '@/lib/utils'
import { Sparkles, ShieldCheck, QrCode } from 'lucide-react'

interface IosMemberCardProps {
  nama: string
  username: string
  saldo: number
  hutang: number
  shu: number
  anggotaId?: number
  onShowQR?: () => void
}

export function IosMemberCard({
  nama,
  username,
  saldo,
  hutang,
  shu,
  anggotaId,
  onShowQR,
}: IosMemberCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-6 shadow-xl shadow-blue-950/20 border border-white/10 active:scale-[0.99] transition-transform duration-200">
      {/* Background Glass Highlights & Holographic Shine */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Card Top: Logo, Cooperative Name & Member ID */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1.5 flex items-center justify-center shadow-inner">
            <img src="/Logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight text-white leading-tight">KOPERASI PK</h3>
            <p className="text-[10px] text-blue-300 font-semibold tracking-wider uppercase">Kartu Anggota Digital</p>
          </div>
        </div>
        {onShowQR && (
          <button
            onClick={onShowQR}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white transition-colors"
          >
            <QrCode className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Card Middle: Primary Balance (Saldo) */}
      <div className="my-6 relative z-10">
        <p className="text-xs text-blue-200/80 font-medium tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          Saldo Simpanan
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-1">
          {formatRupiah(saldo)}
        </h2>
      </div>

      {/* Card Bottom: Hutang, SHU & Name */}
      <div className="pt-4 border-t border-white/10 flex items-end justify-between relative z-10">
        <div>
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Pemilik Kartu</p>
          <p className="text-sm font-bold text-white tracking-tight">{nama || username}</p>
          <p className="text-[10px] text-blue-300/80 font-mono">ID: #{anggotaId || '-'}</p>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[10px] text-rose-300 font-medium uppercase tracking-wider">Hutang</p>
            <p className="text-xs sm:text-sm font-bold text-rose-400">{formatRupiah(hutang)}</p>
          </div>
          <div>
            <p className="text-[10px] text-emerald-300 font-medium uppercase tracking-wider">SHU</p>
            <p className="text-xs sm:text-sm font-bold text-emerald-400">{formatRupiah(shu)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
export default IosMemberCard
`);

write('src/components/ios/IosList.tsx', `
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
`);

write('src/components/ios/IosBottomSheet.tsx', `
import React, { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface IosBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function IosBottomSheet({ isOpen, onClose, title, children }: IosBottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-Up Sheet */}
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[32px] sm:rounded-[28px] p-6 shadow-2xl z-10 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10 duration-200 pb-safe">
        {/* iOS Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 shrink-0" />

        {title && (
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 shrink-0">
            <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="mt-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
export default IosBottomSheet
`);

write('src/components/ios/IosSegmentedControl.tsx', `
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
`);

