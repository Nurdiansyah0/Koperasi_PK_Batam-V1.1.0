import api from '@/lib/api'

export interface ApiKeyItem {
  id: number
  name: string
  key: string
  masked_secret: string | null
  secret?: string
  permissions: string[]
  allowed_origins: string
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  is_expired: boolean
  created_by: string
  created_at: string
}

export interface CreateApiKeyPayload {
  name: string
  permissions?: string[]
  allowed_origins?: string
  expires_in_days?: number | null
}

export const apiKeyService = {
  listKeys: async () => {
    const { data } = await api.get('/laravel/api/admin/api-keys')
    return data
  },

  createKey: async (payload: CreateApiKeyPayload) => {
    const { data } = await api.post('/laravel/api/admin/api-keys', payload)
    return data
  },

  toggleKey: async (id: number) => {
    const { data } = await api.put(`/laravel/api/admin/api-keys/${id}/toggle`)
    return data
  },

  deleteKey: async (id: number) => {
    const { data } = await api.delete(`/laravel/api/admin/api-keys/${id}`)
    return data
  },

  testEndpoint: async (path: string, apiKey: string) => {
    const res = await fetch(path, {
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json'
      }
    })
    return await res.json()
  }
}
