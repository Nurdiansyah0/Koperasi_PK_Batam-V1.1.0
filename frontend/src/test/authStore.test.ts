import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

describe('Auth Store (Zustand)', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().logout()
  })

  it('should initialize with unauthenticated state', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
  })

  it('should authenticate user and store token on setAuth', () => {
    const mockUser: User = {
      user_id: 1,
      username: 'admin1',
      role: 'admin',
    }
    const mockToken = 'jwt-test-token-12345'

    useAuthStore.getState().setAuth(mockUser, mockToken)

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(mockUser)
    expect(state.token).toBe(mockToken)
    expect(localStorage.getItem('token')).toBe(mockToken)
  })

  it('should clear state and localStorage on logout', () => {
    const mockUser: User = {
      user_id: 2,
      username: 'kasir1',
      role: 'kasir',
    }
    useAuthStore.getState().setAuth(mockUser, 'test-token')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
})
