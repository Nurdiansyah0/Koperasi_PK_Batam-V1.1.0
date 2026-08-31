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