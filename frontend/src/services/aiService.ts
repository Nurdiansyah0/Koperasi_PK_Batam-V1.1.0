import api from '@/lib/api'

export interface AiStatusResponse {
  success: boolean
  is_configured: boolean
  model: string
}

export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

export interface ChatResponse {
  success: boolean
  reply?: string
  error?: string
  is_demo?: boolean
}

export interface BusinessInsightsResponse {
  success: boolean
  is_demo?: boolean
  error?: string
  data?: {
    summary: string
    kpi_score?: number
    highlights: string[]
    recommendations: string[]
    stock_action_needed?: string[]
    metrics?: {
      total_barang: number
      stok_kritis_count: number
      daftar_stok_kritis: Array<{
        barang_id: number
        nama_barang: string
        stok: number
        harga_modal: number
        harga_jual: number
      }>
      total_hutang_anggota: number
      total_saldo_anggota: number
      total_shu_tersedia: number
      produk_terlaris: Array<{
        nama_barang: string
        total_terjual: number
        total_omset: number
        total_profit: number
      }>
    }
  }
}

export interface ScannedInvoiceItem {
  nama_barang: string
  jumlah: number
  harga_beli_satuan: number
  total_harga: number
  satuan?: string
}

export interface InvoiceScanResponse {
  success: boolean
  is_demo?: boolean
  error?: string
  message?: string
  data?: {
    supplier_name?: string
    tanggal_nota?: string
    total_belanja?: number
    items: ScannedInvoiceItem[]
  }
}

export const aiService = {
  /**
   * Check AI connection and model status
   */
  getStatus: async (): Promise<AiStatusResponse> => {
    const { data } = await api.get<AiStatusResponse>('/laravel/api/ai/status')
    return data
  },

  /**
   * Send a question to AI Assistant
   */
  askAssistant: async (message: string, history: ChatMessage[] = []): Promise<ChatResponse> => {
    const { data } = await api.post<ChatResponse>('/laravel/api/ai/chat', {
      message,
      history,
    })
    return data
  },

  /**
   * Get Business and Financial Analysis for Admin
   */
  getBusinessInsights: async (): Promise<BusinessInsightsResponse> => {
    const { data } = await api.get<BusinessInsightsResponse>('/laravel/api/ai/insights')
    return data
  },

  /**
   * Scan Receipt or Invoice photo using Gemini Vision OCR
   */
  scanInvoice: async (fileOrBase64: File | string, mimeType: string = 'image/jpeg'): Promise<InvoiceScanResponse> => {
    if (typeof fileOrBase64 === 'string') {
      const { data } = await api.post<InvoiceScanResponse>('/laravel/api/ai/scan-invoice', {
        image_base64: fileOrBase64,
        mime_type: mimeType,
      })
      return data
    } else {
      const formData = new FormData()
      formData.append('image', fileOrBase64)
      const { data } = await api.post<InvoiceScanResponse>('/laravel/api/ai/scan-invoice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return data
    }
  },
}
