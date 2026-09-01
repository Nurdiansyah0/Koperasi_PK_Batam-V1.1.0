import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'

// Mock dependencies
vi.mock('@/services/authService', () => ({
  authService: {
    login: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('LoginPage Error Handling & Authentication Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().logout()
  })

  it('renders login form properly with inputs and buttons', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    expect(screen.getByPlaceholderText(/masukkan username/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/masukkan password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /masuk ke portal/i })).toBeInTheDocument()
  })

  it('handles invalid credentials (wrong password / username) gracefully', async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({
      success: false,
      token: '',
      user: {} as any,
      message: 'Username atau password salah',
    })

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    fireEvent.change(screen.getByPlaceholderText(/masukkan username/i), {
      target: { value: 'wronguser' },
    })
    fireEvent.change(screen.getByPlaceholderText(/masukkan password/i), {
      target: { value: 'wrongpassword' },
    })
    fireEvent.click(screen.getByRole('button', { name: /masuk ke portal/i }))

    await waitFor(() => {
      expect(screen.getByText('Username atau password salah')).toBeInTheDocument()
    })
  })

  it('handles server network failure or HTTP 500 error gracefully', async () => {
    vi.mocked(authService.login).mockRejectedValueOnce({
      response: {
        data: { message: 'Gagal terhubung ke database server' },
      },
    })

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    fireEvent.change(screen.getByPlaceholderText(/masukkan username/i), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByPlaceholderText(/masukkan password/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /masuk ke portal/i }))

    await waitFor(() => {
      expect(screen.getByText('Gagal terhubung ke database server')).toBeInTheDocument()
    })
  })

  it('toggles password visibility when clicking the eye icon button', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    const passwordInput = screen.getByPlaceholderText(/masukkan password/i) as HTMLInputElement
    expect(passwordInput.type).toBe('password')

    // Find the toggle button inside the password container
    const toggleButton = passwordInput.parentElement?.querySelector('button')
    expect(toggleButton).toBeTruthy()

    if (toggleButton) {
      fireEvent.click(toggleButton)
      expect(passwordInput.type).toBe('text')

      fireEvent.click(toggleButton)
      expect(passwordInput.type).toBe('password')
    }
  })

  it('logs in successfully and navigates to role dashboard on valid credentials', async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({
      success: true,
      token: 'mock-token-12345',
      user: {
        user_id: 1,
        username: 'Admin',
        role: 'admin',
        nama_lengkap: 'Administrator Utama',
      },
    })

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    fireEvent.change(screen.getByPlaceholderText(/masukkan username/i), {
      target: { value: 'Admin' },
    })
    fireEvent.change(screen.getByPlaceholderText(/masukkan password/i), {
      target: { value: 'password' },
    })
    fireEvent.click(screen.getByRole('button', { name: /masuk ke portal/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin')
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().token).toBe('mock-token-12345')
    })
  })
})
