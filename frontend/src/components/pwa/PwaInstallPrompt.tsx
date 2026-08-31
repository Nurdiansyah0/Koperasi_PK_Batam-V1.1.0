import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    const dismissed = localStorage.getItem('pwa_prompt_dismissed')
    if (!dismissed && isIosDevice) {
      setShowPrompt(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa_prompt_dismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-slate-900/95 text-white p-4 rounded-3xl shadow-2xl backdrop-blur-xl border border-slate-700/60 animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-inner">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Install Koperasi PK</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              {isIOS 
                ? 'Tekan ikon Bagikan (Share) lalu pilih "Tambahkan ke Layar Utama"' 
                : 'Aplikasi cepat, ringan & bisa diakses langsung dari homescreen ponsel!'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!isIOS && deferredPrompt && (
        <div className="mt-3 flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-slate-300 hover:text-white text-xs h-8">
            Nanti saja
          </Button>
          <Button size="sm" variant="primary" onClick={handleInstallClick} className="text-xs h-8 gap-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl">
            <Download className="w-3.5 h-3.5" />
            Install Sekarang
          </Button>
        </div>
      )}
    </div>
  )
}
export default PwaInstallPrompt