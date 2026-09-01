import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, X, Bot, User as UserIcon, RefreshCw, ChevronDown, Minimize2 } from 'lucide-react'
import { aiService, ChatMessage } from '@/services/aiService'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export function AiAssistantWidget() {
  const { user } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'model'; content: string }>>([
    {
      role: 'model',
      content: `Halo ${user?.username || ''}! 👋 Saya Asisten AI Koperasi PK Batam yang ditenagai oleh Google AI Studio (Gemini). Ada yang bisa saya bantu hari ini?`,
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const getSuggestedPrompts = () => {
    if (user?.role === 'anggota') {
      return [
        'Berapa sisa saldo & hutang saya?',
        'Bagaimana sistem bagi hasil SHU?',
        'Cara berbelanja di koperasi',
      ]
    } else if (user?.role === 'kasir') {
      return [
        'Ada berapa stok yang menipis?',
        'Prosedur serah terima shift kasir',
        'Kebijakan transaksi metode hutang',
      ]
    } else {
      return [
        'Berikan ringkasan performa penjualan',
        'Barang apa yang perlu segera direstock?',
        'Bagaimana rasio hutang anggota saat ini?',
      ]
    }
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim()
    if (!text || isLoading) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInputMessage('')
    setIsLoading(true)

    try {
      // Send previous conversation history to preserve context
      const historyPayload = newMessages.slice(0, -1)
      const res = await aiService.askAssistant(text, historyPayload)

      if (res.success && res.reply) {
        setMessages((prev) => [...prev, { role: 'model', content: res.reply! }])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'model', content: res.error || 'Maaf, terjadi kendala saat memproses jawaban.' },
        ])
      }
    } catch (err: any) {
      toast.error('Gagal mengirim pesan ke AI')
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: 'Terjadi kesalahan koneksi ke server AI. Pastikan backend aktif.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 font-bold text-xs sm:text-sm border border-white/20 backdrop-blur-sm group"
          title="Buka Asisten AI"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white" />
          </div>
          <span className="tracking-wide hidden xs:inline font-semibold">Tanya AI Koperasi</span>
        </button>
      )}

      {/* Floating Chat Modal Box */}
      {isOpen && (
        <div className="fixed bottom-16 sm:bottom-6 right-2 sm:right-6 z-50 w-[94vw] sm:w-[420px] max-w-[440px] h-[540px] max-h-[82vh] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-zinc-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300 font-sans">
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm tracking-tight">Asisten AI Koperasi</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-mono tracking-wide text-white/90">
                    Gemini
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/90 font-medium">Google AI Studio</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setMessages([
                    {
                      role: 'model',
                      content: `Sesi obrolan telah direset. Ada yang bisa saya bantu, ${user?.username}?`,
                    },
                  ])
                }
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Reset Chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 dark:bg-zinc-950/40 text-xs sm:text-sm">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'model' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-xs ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-xs font-medium'
                      : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 rounded-tl-xs border border-slate-200/70 dark:border-zinc-700/60'
                  }`}
                >
                  {m.content}
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-300 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-500 dark:text-zinc-400 py-1">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
                  <span className="text-xs text-slate-400 ml-1">Sedang berpikir...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800/80 flex gap-1.5 overflow-x-auto no-scrollbar">
            {getSuggestedPrompts().map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                disabled={isLoading}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50 dark:hover:text-blue-400 text-slate-600 dark:text-zinc-300 font-medium transition-colors border border-slate-200/60 dark:border-zinc-700/60 active:scale-95"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="p-3 bg-white dark:bg-zinc-900 border-t border-slate-200/70 dark:border-zinc-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ketik pertanyaan seputar Koperasi..."
              disabled={isLoading}
              className="flex-1 bg-slate-100 dark:bg-zinc-800/80 text-slate-900 dark:text-zinc-100 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 focus:outline-hidden transition-all"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold transition-transform active:scale-95 shrink-0 shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
