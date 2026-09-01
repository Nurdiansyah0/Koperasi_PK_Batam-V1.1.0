import api from '@/lib/api'
import type { LoginResponse, ApiResponse, User } from '@/types'

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    // Moved to Laravel Endpoint
    const { data } = await api.post<LoginResponse>('/laravel/api/login', { username, password })
    return data
  },

  autoLogin: async (): Promise<{ success: boolean; user: User }> => {
    // Moved to Laravel Endpoint
    const { data } = await api.get<{ success: boolean; user: User }>('/laravel/api/me')
    return data
  },

  changePassword: async (old_password: string, new_password: string): Promise<ApiResponse> => {
    const { data } = await api.post<ApiResponse>('/laravel/api/anggota/change-password', {
      current_password: old_password,
      new_password,
    })
    return data
  },

  resetPasswordWithChallenge: async (payload: {
    username: string
    digit_hutang: string
    digit_shu: string
    password_baru: string
  }): Promise<ApiResponse> => {
    const { data } = await api.post<ApiResponse>('/laravel/api/reset-password', payload)
    return data
  },
}
