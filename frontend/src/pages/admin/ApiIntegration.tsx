import { useEffect, useState } from 'react'
import { apiKeyService, type ApiKeyItem } from '@/services/apiKeyService'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  KeyRound, ShieldCheck, Copy, Check, Plus, Trash2,
  Terminal, Code2, Globe, RefreshCw, CheckCircle2,
  AlertCircle, Play, Eye, EyeOff, LayoutTemplate, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'

export function ApiIntegration() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'keys' | 'docs' | 'tester' | 'widgets'>('keys')
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [allowedOrigins, setAllowedOrigins] = useState('*')
  const [selectedPerms, setSelectedPerms] = useState<string[]>(['*'])
  const [expiresInDays, setExpiresInDays] = useState<string>('0')
  const [createdKeyData, setCreatedKeyData] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)

  // Tester State
  const [selectedEndpoint, setSelectedEndpoint] = useState('/laravel/api/v1/summary')
  const [selectedKeyForTest, setSelectedKeyForTest] = useState<string>('')
  const [testResponse, setTestResponse] = useState<any | null>(null)
  const [testing, setTesting] = useState(false)
  const [codeLang, setCodeLang] = useState<'fetch' | 'axios' | 'php' | 'python' | 'curl'>('fetch')

  // Copied state
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const originUrl = window.location.origin

  const availablePermissions = [
    { id: '*', label: 'Semua Akses Penuh (*)', desc: 'Akses seluruh data, katalog, anggota, laporan, & asset' },
    { id: 'read:summary', label: 'Ringkasan Koperasi', desc: 'Akses statistik omset, SHU, & status toko' },
    { id: 'read:katalog', label: 'Katalog Produk & Stok', desc: 'Akses data barang, foto produk, harga, & stok' },
    { id: 'read:anggota', label: 'Data Anggota', desc: 'Akses profil anggota, saldo, & simpanan' },
    { id: 'read:laporan', label: 'Laporan Keuangan', desc: 'Akses laporan transaksi, audit SHU, & rasio' },
    { id: 'read:transaksi', label: 'Log Transaksi', desc: 'Akses rincian struk belanja kasir' },
    { id: 'assets:all', label: 'Asset & Media', desc: 'Akses URL logo SVG, icon PWA, & file media' },
  ]

  const endpointsList = [
    { path: '/laravel/api/v1/ping', method: 'GET', name: 'Ping & Gateway Health', desc: 'Cek koneksi & validitas API Key' },
    { path: '/laravel/api/v1/summary', method: 'GET', name: 'Ringkasan Finansial', desc: 'Total omset, SHU, kas vs piutang' },
    { path: '/laravel/api/v1/katalog', method: 'GET', name: 'Katalog Produk & Foto', desc: 'Daftar produk, stok toko/gudang, foto' },
    { path: '/laravel/api/v1/anggota', method: 'GET', name: 'Daftar 65 Anggota', desc: 'Nama, saldo simpanan, hutang, & SHU' },
    { path: '/laravel/api/v1/laporan', method: 'GET', name: 'Laporan SHU Real-Time', desc: 'Rekonsiliasi pilar 60/30/10 & subledger' },
    { path: '/laravel/api/v1/transaksi', method: 'GET', name: 'Histori Transaksi Kasir', desc: 'Log struk belanja dan metode bayar' },
    { path: '/laravel/api/v1/assets', method: 'GET', name: 'Asset, Logo & Media URL', desc: 'Daftar direct link logo, icon, & embed' },
    { path: '/laravel/api/v1/ui/widget-data', method: 'GET', name: 'Widget Data Siap Pakai', desc: 'Payload UI untuk ditancap di web pribadi' },
  ]

  const loadKeys = async () => {
    setLoading(true)
    try {
      const res = await apiKeyService.listKeys()
      if (res.success) {
        setKeys(res.data || [])
        if (res.data?.length > 0 && !selectedKeyForTest) {
          setSelectedKeyForTest(res.data[0].key)
        }
      }
    } catch {
      toast.error('Gagal memuat daftar API Key')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    toast.success(`${label} berhasil disalin!`)
    setTimeout(() => setCopiedText(null), 2500)
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyName.trim()) {
      toast.error('Nama API Key wajib diisi')
      return
    }

    setCreating(true)
    try {
      const res = await apiKeyService.createKey({
        name: keyName.trim(),
        permissions: selectedPerms,
        allowed_origins: allowedOrigins.trim() || '*',
        expires_in_days: expiresInDays === '0' ? null : parseInt(expiresInDays)
      })

      if (res.success) {
        toast.success('API Key berhasil dibuat!')
        setCreatedKeyData(res.data)
        loadKeys()
      }
    } catch {
      toast.error('Gagal membuat API Key')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (id: number) => {
    try {
      const res = await apiKeyService.toggleKey(id)
      if (res.success) {
        toast.success(res.message)
        loadKeys()
      }
    } catch {
      toast.error('Gagal mengubah status API Key')
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus API Key "${name}" secara permanen? Akses dari web luar dengan key ini akan terputus.`)) {
      return
    }

    try {
      const res = await apiKeyService.deleteKey(id)
      if (res.success) {
        toast.success('API Key berhasil dihapus')
        loadKeys()
      }
    } catch {
      toast.error('Gagal menghapus API Key')
    }
  }

  const handleRunTest = async () => {
    if (!selectedKeyForTest) {
      toast.error('Pilih atau buat API Key terlebih dahulu')
      return
    }

    setTesting(true)
    setTestResponse(null)
    try {
      const fullUrl = `${originUrl}${selectedEndpoint}`
      const res = await apiKeyService.testEndpoint(fullUrl, selectedKeyForTest)
      setTestResponse(res)
      toast.success('Response diterima dari Gateway!')
    } catch (err: any) {
      setTestResponse({ error: true, message: err?.message || 'Gagal menghubungi endpoint' })
      toast.error('Gagal melakukan request API')
    } finally {
      setTesting(false)
    }
  }

  const generateCodeSnippet = (lang: string, path: string, key: string) => {
    const fullUrl = `${originUrl}${path}`
    const authKey = key || 'kop_live_YOUR_API_KEY_HERE'

    switch (lang) {
      case 'fetch':
        return `// 1. Ambil data Koperasi via JavaScript (Fetch API)
async function fetchKoperasiData() {
  const response = await fetch('${fullUrl}', {
    method: 'GET',
    headers: {
      'X-API-KEY': '${authKey}',
      'Accept': 'application/json'
    }
  });
  
  const result = await response.json();
  console.log('Data Koperasi PKP-PK:', result.data);
  return result;
}

fetchKoperasiData();`

      case 'axios':
        return `// 2. Ambil data via Axios
import axios from 'axios';

const api = axios.create({
  baseURL: '${originUrl}',
  headers: {
    'X-API-KEY': '${authKey}',
    'Accept': 'application/json'
  }
});

api.get('${path}')
  .then(res => console.log('Data:', res.data))
  .catch(err => console.error('Error:', err));`

      case 'php':
        return `<?php
// 3. Ambil data via PHP cURL di Web Pribadi Anda
$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => '${fullUrl}',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'X-API-KEY: ${authKey}',
    'Accept: application/json'
  ],
]);

$response = curl_exec($curl);
curl_close($curl);

$koperasiData = json_decode($response, true);
print_r($koperasiData);
?>`

      case 'python':
        return `# 4. Ambil data via Python Requests
import requests

url = '${fullUrl}'
headers = {
    'X-API-KEY': '${authKey}',
    'Accept': 'application/json'
}

response = requests.get(url, headers=headers)
data = response.json()
print(data)`

      case 'curl':
        return `# 5. Test langsung di Terminal Linux / Mac / Windows
curl -X GET "${fullUrl}" \\
  -H "X-API-KEY: ${authKey}" \\
  -H "Accept: application/json"`

      default:
        return ''
    }
  }

  const activeKeyCount = keys.filter(k => k.is_active && !k.is_expired).length

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Integrasi API & Gateway Web
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  GATEWAY ONLINE
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hubungkan website pribadi, widget portofolio, atau aplikasi luar dengan data Koperasi PKP-PK secara aman.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadKeys}
            className="rounded-2xl gap-1.5 font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setKeyName('')
              setAllowedOrigins('*')
              setSelectedPerms(['*'])
              setExpiresInDays('0')
              setCreatedKeyData(null)
              setIsCreateModalOpen(true)
            }}
            className="rounded-2xl gap-1.5 font-bold bg-blue-600 hover:bg-blue-700 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Buat API Key Baru
          </Button>
        </div>
      </div>

      {/* ── 4 Executive Metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Status Gateway</div>
          <div className="text-base font-black text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Online (v2.1)
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">{originUrl}/laravel/api/v1</p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">API Key Aktif</div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">
            {activeKeyCount} / {keys.length} Key
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Siap menerima request eksternal</p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Endpoints Tersedia</div>
          <div className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
            8 Endpoints REST
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Summary, Katalog, Anggota, Laporan, Asset</p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Keamanan & CORS</div>
          <div className="text-base font-black text-slate-700 dark:text-slate-300 font-mono">
            SHA-256 + CORS
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Whitelisting domain & token header</p>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex gap-1.5 border-b border-slate-200 dark:border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'keys', label: `Daftar API Key (${keys.length})`, icon: KeyRound },
          { id: 'docs', label: 'Dokumentasi & Generator Kode', icon: Code2 },
          { id: 'tester', label: 'Live API Tester', icon: Terminal },
          { id: 'widgets', label: 'Widget UI & Asset Media', icon: LayoutTemplate },
        ].map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 active:scale-95 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: MANAJEMEN API KEY ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Kredensial API Key Terdaftar
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Gunakan key ini di header <code className="font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-blue-600 font-bold">X-API-KEY</code> saat memanggil backend Koperasi dari web luar.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Memuat API Key...</div>
            ) : keys.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada API Key</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Buat API Key pertama Anda untuk mulai menghubungkan Koperasi dengan web pribadi atau aplikasi mobile.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="rounded-2xl gap-1.5 font-bold bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  Buat API Key
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {keys.map(k => (
                  <div key={k.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {k.name}
                        </span>
                        {k.is_active ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-800">
                            Nonaktif
                          </span>
                        )}
                        {k.is_expired && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800">
                            Kedaluwarsa
                          </span>
                        )}
                      </div>

                      {/* API Key Box */}
                      <div className="flex items-center gap-2 max-w-xl">
                        <div className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 flex-1 truncate border border-slate-200 dark:border-zinc-700">
                          {k.key}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(k.key, 'API Key')}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 transition-colors shrink-0"
                          title="Salin API Key"
                        >
                          {copiedText === 'API Key' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        <span>CORS Origin: <strong className="text-slate-600 dark:text-slate-300 font-mono">{k.allowed_origins}</strong></span>
                        <span>Izin: <strong className="text-slate-600 dark:text-slate-300">{k.permissions?.join(', ')}</strong></span>
                        <span>Terakhir Dipakai: <strong className="text-slate-600 dark:text-slate-300">{k.last_used_at ? new Date(k.last_used_at).toLocaleString('id-ID') : 'Belum pernah'}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(k.id)}
                        className={`text-xs font-bold rounded-xl ${k.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      >
                        {k.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(k.id, k.name)}
                        className="text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: DOKUMENTASI ENDPOINT & KODE GENERATOR ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Endpoint List */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
              Daftar Endpoint API v1
            </h3>
            <div className="space-y-1.5">
              {endpointsList.map(ep => (
                <div
                  key={ep.path}
                  onClick={() => setSelectedEndpoint(ep.path)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    selectedEndpoint === ep.path
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-xs'
                      : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {ep.name}
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">
                      {ep.method}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 truncate">
                    {ep.path}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{ep.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Code Generator */}
          <div className="lg:col-span-2 space-y-3">
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white shadow-lg border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-blue-400" />
                    Contoh Kode Integrasi
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Salin kode di bawah untuk langsung dipasang di web pribadi Anda.
                  </p>
                </div>

                {/* Language Switcher */}
                <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl">
                  {[
                    { id: 'fetch', label: 'Fetch JS' },
                    { id: 'axios', label: 'Axios' },
                    { id: 'php', label: 'PHP' },
                    { id: 'python', label: 'Python' },
                    { id: 'curl', label: 'cURL' },
                  ].map(l => (
                    <button
                      key={l.id}
                      onClick={() => setCodeLang(l.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        codeLang === l.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Display */}
              <div className="relative">
                <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-blue-300 overflow-x-auto leading-relaxed border border-slate-800/80">
                  {generateCodeSnippet(codeLang, selectedEndpoint, selectedKeyForTest)}
                </pre>
                <button
                  type="button"
                  onClick={() => copyToClipboard(generateCodeSnippet(codeLang, selectedEndpoint, selectedKeyForTest), 'Contoh Kode')}
                  className="absolute right-3 top-3 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  {copiedText === 'Contoh Kode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Salin Kode
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Header Otentikasi: <code className="text-emerald-400 font-mono">X-API-KEY: {selectedKeyForTest || 'kop_live_...'}</code></span>
                <button
                  onClick={() => { setActiveTab('tester'); }}
                  className="text-blue-400 hover:underline font-bold flex items-center gap-1"
                >
                  Test di Live Tester →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: LIVE API TESTER ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tester' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Live API Endpoint Explorer
              </h3>
              <p className="text-xs text-slate-500">
                Pilih endpoint dan API Key untuk mengeksekusi request langsung secara real-time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Gunakan API Key:</label>
                <select
                  value={selectedKeyForTest}
                  onChange={e => setSelectedKeyForTest(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-mono font-bold"
                >
                  {keys.map(k => (
                    <option key={k.id} value={k.key}>{k.name} ({k.key.substring(0, 15)}...)</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Pilih Endpoint URL:</label>
                <div className="flex gap-2">
                  <select
                    value={selectedEndpoint}
                    onChange={e => setSelectedEndpoint(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-mono font-bold"
                  >
                    {endpointsList.map(ep => (
                      <option key={ep.path} value={ep.path}>[{ep.method}] {ep.path} — {ep.name}</option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    onClick={handleRunTest}
                    disabled={testing}
                    className="rounded-2xl gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    <Play className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                    {testing ? 'Memproses...' : 'Kirim Request'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Live Response Viewer */}
            {testResponse && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    HTTP Response Body (JSON):
                  </span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(testResponse, null, 2), 'JSON Response')}
                    className="text-[11px] text-blue-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Salin JSON
                  </button>
                </div>
                <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-96 border border-slate-800">
                  {JSON.stringify(testResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: WIDGET UI & ASSET MEDIA ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'widgets' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Asset Branding & Embed Widget Koperasi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gunakan link langsung asset logo, favicon, atau tempelkan iframe widget koperasi di website pribadi Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asset Links */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase">Direct Asset Links</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border">
                    <span className="font-bold">Logo Utama (SVG)</span>
                    <button
                      onClick={() => copyToClipboard(`${originUrl}/Logo.svg`, 'Logo SVG')}
                      className="text-blue-600 hover:underline font-mono text-[11px]"
                    >
                      Salin URL
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border">
                    <span className="font-bold">Icon PNG (512x512)</span>
                    <button
                      onClick={() => copyToClipboard(`${originUrl}/icon-512x512.png`, 'Icon 512')}
                      className="text-blue-600 hover:underline font-mono text-[11px]"
                    >
                      Salin URL
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border">
                    <span className="font-bold">PWA Web Manifest</span>
                    <button
                      onClick={() => copyToClipboard(`${originUrl}/manifest.webmanifest`, 'Manifest')}
                      className="text-blue-600 hover:underline font-mono text-[11px]"
                    >
                      Salin URL
                    </button>
                  </div>
                </div>
              </div>

              {/* HTML Snippet */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase">HTML Badge & Embed Snippet</h4>
                <pre className="p-3 rounded-xl bg-slate-900 text-blue-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
{`<!-- Badge Logo Koperasi PKP-PK -->
<a href="${originUrl}" target="_blank" rel="noopener">
  <img src="${originUrl}/Logo.svg" alt="Koperasi PKP-PK" width="140" />
</a>`}
                </pre>
                <button
                  onClick={() => copyToClipboard(`<a href="${originUrl}" target="_blank"><img src="${originUrl}/Logo.svg" alt="Koperasi PKP-PK" width="140" /></a>`, 'HTML Badge')}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" /> Salin Tag HTML
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: CREATE API KEY ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Buat API Key Baru"
      >
        {createdKeyData ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                API Key Berhasil Dibuat!
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Simpan API Key ini sekarang. Untuk keamanan, kredensial ini hanya ditampilkan penuh sekali ini saja.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">API Key (X-API-KEY):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdKeyData.key}
                    className="w-full p-2.5 bg-slate-100 dark:bg-zinc-800 rounded-xl font-mono text-xs font-bold text-blue-600 dark:text-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdKeyData.key, 'API Key')}
                    className="p-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shrink-0"
                  >
                    Salin Key
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">API Secret (HMAC/Webhook):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdKeyData.secret}
                    className="w-full p-2.5 bg-slate-100 dark:bg-zinc-800 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdKeyData.secret, 'API Secret')}
                    className="p-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs shrink-0"
                  >
                    Salin Secret
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <Button
                variant="primary"
                onClick={() => setIsCreateModalOpen(false)}
                className="font-bold bg-blue-600"
              >
                Selesai
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateKey} className="space-y-4 py-1">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Nama Aplikasi / Deskripsi Key <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Web Pribadi Nurdiansyah, Blog Portofolio, App Mobile"
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Domain Whitelist (CORS Allowed Origins)
              </label>
              <input
                type="text"
                placeholder="Gunakan * untuk semua domain, atau https://nurdiansyah.dev"
                value={allowedOrigins}
                onChange={e => setAllowedOrigins(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Gunakan <code className="font-mono font-bold">*</code> agar dapat diakses dari localhost atau website mana pun tanpa diblokir browser.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Masa Berlaku Key
              </label>
              <select
                value={expiresInDays}
                onChange={e => setExpiresInDays(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs"
              >
                <option value="0">Selamanya (Tidak Kedaluwarsa)</option>
                <option value="30">30 Hari</option>
                <option value="90">90 Hari (3 Bulan)</option>
                <option value="365">1 Tahun (365 Hari)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Hak Akses Endpoint (Permissions)
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {availablePermissions.map(p => {
                  const isChecked = selectedPerms.includes(p.id)
                  return (
                    <label
                      key={p.id}
                      className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300' : 'bg-white dark:bg-zinc-900 border-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          if (p.id === '*') {
                            setSelectedPerms(e.target.checked ? ['*'] : [])
                          } else {
                            const withoutAll = selectedPerms.filter(x => x !== '*')
                            if (e.target.checked) {
                              setSelectedPerms([...withoutAll, p.id])
                            } else {
                              setSelectedPerms(withoutAll.filter(x => x !== p.id))
                            }
                          }
                        }}
                        className="mt-0.5 rounded text-blue-600"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.label}</div>
                        <div className="text-[10px] text-slate-400">{p.desc}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={creating}
                className="font-bold bg-blue-600"
              >
                {creating ? 'Membuat...' : 'Buat API Key'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

export default ApiIntegration
