import { afterEach, expect, it, vi } from 'vitest'
import { validateImage } from './Images'

afterEach(() => vi.unstubAllGlobals())
it('rejects files with unsupported type or oversized content before decoding', async () => {
  await expect(
    validateImage(new File(['<svg/>'], 'file.svg', { type: 'image/svg+xml' })),
  ).rejects.toThrow('PNG or JPEG')
  await expect(
    validateImage(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }),
    ),
  ).rejects.toThrow('5 MB')
})
it('checks dimensions and releases decoded image memory', async () => {
  const close = vi.fn()
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 5000, height: 100, close }))
  await expect(validateImage(new File(['png'], 'file.png', { type: 'image/png' }))).rejects.toThrow(
    '4096',
  )
  expect(close).toHaveBeenCalledOnce()
})
