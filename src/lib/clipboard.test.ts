import { afterEach, expect, it, vi } from 'vitest'
import { copyText } from './clipboard'
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
it('copies using the modern clipboard API', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  await copyText('invite')
  expect(writeText).toHaveBeenCalledWith('invite')
})
it('falls back when clipboard permissions are denied and removes the temporary field', async () => {
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error()) } })
  Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => true) })
  await copyText('invite')
  expect(document.execCommand).toHaveBeenCalledWith('copy')
  expect(document.querySelector('textarea')).toBeNull()
})
it('reports failure instead of pretending to have copied', async () => {
  vi.stubGlobal('navigator', {})
  Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) })
  await expect(copyText('invite')).rejects.toThrow()
  expect(document.querySelector('textarea')).toBeNull()
})
