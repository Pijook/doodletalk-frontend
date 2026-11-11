import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { PrivateImage } from './Images'
import { api } from '../lib/api'
import { setLanguage } from '../lib/i18n'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
it('uses the authorized blob for preview and download, and changes zoom independently', async () => {
  setLanguage('en')
  vi.spyOn(api, 'image').mockResolvedValue(new Blob(['image'], { type: 'image/jpeg' }))
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:authorized-image')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) { this.setAttribute('open', '') },
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PrivateImage path="/api/games/test/image" alt="A drawing" interactive />
    </QueryClientProvider>,
  )
  await waitFor(() =>
    expect(screen.getByRole('link', { name: 'Download image' }).getAttribute('href')).toBe(
      'blob:authorized-image',
    ),
  )
  expect(screen.getByRole('link', { name: 'Download image' }).getAttribute('download')).toBe(
    'doodletalk.jpg',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Enlarge image' }))
  fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } })
  expect(screen.getByRole('slider', { name: /200%/ })).toBeTruthy()
  expect(screen.getAllByRole('img')[1].style.width).toBe('200%')
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  expect(screen.queryByText('Image preview')).toBeNull()
})
