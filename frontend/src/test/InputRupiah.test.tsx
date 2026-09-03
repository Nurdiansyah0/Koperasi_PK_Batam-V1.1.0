import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InputRupiah } from '@/components/ui/InputRupiah'

describe('InputRupiah', () => {
  it('renders correctly with initial 0', () => {
    const handleChange = vi.fn()
    render(<InputRupiah value={0} onChange={handleChange} data-testid="input" />)
    const input = screen.getByTestId('input') as HTMLInputElement
    expect(input.value).toBe('0')
  })

  it('renders correctly with empty string', () => {
    const handleChange = vi.fn()
    render(<InputRupiah value="" onChange={handleChange} data-testid="input" />)
    const input = screen.getByTestId('input') as HTMLInputElement
    expect(input.value).toBe('')
  })
})
