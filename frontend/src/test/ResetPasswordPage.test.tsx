import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { authService } from '@/services/authService'

vi.mock('@/services/authService', () => ({
  authService: {
    resetPasswordWithChallenge: vi.fn(),
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

describe('ResetPasswordPage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates password match on submit', async () => {
    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    )

    fireEvent.change(screen.getByPlaceholderText(/masukkan username/i), {
      target: { value: 'Nurdiansyah' },
    })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 35/i), {
      target: { value: '35' },
    })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 750/i), {
      target: { value: '750' },
    })
    fireEvent.change(screen.getByPlaceholderText(/minimal 6 karakter/i), {
      target: { value: 'secret123' },
    })
    fireEvent.change(screen.getByPlaceholderText(/ketik ulang password/i), {
      target: { value: 'different123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /verifikasi & simpan/i }))

    await waitFor(() => {
      expect(screen.getByText(/konfirmasi password tidak cocok/i)).toBeInTheDocument()
    })
  })

  it('handles verification mismatch error from backend properly', async () => {
    vi.mocked(authService.resetPasswordWithChallenge).mockRejectedValueOnce({
      response: {
        status: 422,
        data: { message: '3 digit belakang SHU tidak sesuai dengan data buku anggota.' },
      },
    })

    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    )

    fireEvent.change(screen.getByPlaceholderText(/masukkan username/i), {
      target: { value: 'Nurdiansyah' },
    })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 35/i), {
      target: { value: '35' },
    })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 750/i), {
      target: { value: '999' },
    })
    fireEvent.change(screen.getByPlaceholderText(/minimal 6 karakter/i), {
      target: { value: 'secret123' },
    })
    fireEvent.change(screen.getByPlaceholderText(/ketik ulang password/i), {
      target: { value: 'secret123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /verifikasi & simpan/i }))

    await waitFor(() => {
      expect(screen.getByText('3 digit belakang SHU tidak sesuai dengan data buku anggota.')).toBeInTheDocument()
    })
  })

  it('resets password successfully when valid verification data is provided', async () => {
    vi.mocked(authService.resetPasswordWithChallenge).mockResolvedValueOnce({
      success: true,
      message: 'Password berhasil diperbarui!',
    })

    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    )

    fireEvent.change(screen.getByPlaceholderText(/masukkan username/i), {
      target: { value: 'Nurdiansyah' },
    })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 35/i), {
      target: { value: '35' },
    })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 750/i), {
      target: { value: '750' },
    })
    fireEvent.change(screen.getByPlaceholderText(/minimal 6 karakter/i), {
      target: { value: 'secret123' },
    })
    fireEvent.change(screen.getByPlaceholderText(/ketik ulang password/i), {
      target: { value: 'secret123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /verifikasi & simpan/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /password berhasil diperbarui/i })).toBeInTheDocument()
    })
  })
})
