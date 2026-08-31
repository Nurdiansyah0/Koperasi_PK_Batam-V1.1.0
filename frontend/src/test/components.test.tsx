import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

describe('UI Components', () => {
  describe('Button', () => {
    it('should render children text properly', () => {
      render(<Button>Klik Saya</Button>)
      expect(screen.getByRole('button', { name: /klik saya/i })).toBeInTheDocument()
    })

    it('should trigger onClick handler when clicked', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Kirim</Button>)
      
      const button = screen.getByRole('button', { name: /kirim/i })
      await userEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should disable button when loading is true', () => {
      render(<Button loading>Menyimpan</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should be disabled when disabled prop is set', () => {
      render(<Button disabled>Nonaktif</Button>)
      const button = screen.getByRole('button', { name: /nonaktif/i })
      expect(button).toBeDisabled()
    })
  })

  describe('Input', () => {
    it('should render label and input field correctly', () => {
      render(<Input label="Nama Lengkap" placeholder="Masukkan nama" />)
      expect(screen.getByText(/nama lengkap/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/masukkan nama/i)).toBeInTheDocument()
    })

    it('should display error message when error prop is provided', () => {
      render(<Input label="Email" error="Format email tidak valid" />)
      expect(screen.getByText(/format email tidak valid/i)).toBeInTheDocument()
    })

    it('should accept typing and update value', async () => {
      render(<Input placeholder="Ketik..." />)
      const input = screen.getByPlaceholderText('Ketik...')
      await userEvent.type(input, 'Testing Koperasi')
      expect(input).toHaveValue('Testing Koperasi')
    })
  })

  describe('Badge', () => {
    it('should render badge with appropriate variant styling', () => {
      render(<Badge variant="success">Lunas</Badge>)
      expect(screen.getByText('Lunas')).toBeInTheDocument()
      expect(screen.getByText('Lunas')).toHaveClass('text-emerald-700')
    })
  })

  describe('Card', () => {
    it('should render card structure with header and content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Rp 500.000</p>
          </CardContent>
        </Card>
      )
      expect(screen.getByText('Ringkasan Saldo')).toBeInTheDocument()
      expect(screen.getByText('Rp 500.000')).toBeInTheDocument()
    })
  })

  describe('Modal', () => {
    it('should not render anything when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Modal Tertutup">
          <p>Konten</p>
        </Modal>
      )
      expect(screen.queryByText('Modal Tertutup')).not.toBeInTheDocument()
    })

    it('should render title and content when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Tambah Barang">
          <p>Form Tambah Barang</p>
        </Modal>
      )
      expect(screen.getByText('Tambah Barang')).toBeInTheDocument()
      expect(screen.getByText('Form Tambah Barang')).toBeInTheDocument()
    })
  })
})
