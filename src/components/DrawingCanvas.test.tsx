import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DrawingCanvas } from './DrawingCanvas'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
it('keeps a non-empty drawing submittable after exhausting the bounded undo history', async () => {
  let pixels = 0
  const storage = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })
  vi.stubGlobal('PointerEvent', MouseEvent)
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null
      value = ''
      set src(value: string) {
        this.value = value
        this.onload?.()
      }
    },
  )
  const context = {
    fillRect: () => {
      pixels = 0
    },
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: () => {
      pixels++
    },
    drawImage: (image: { value: string }) => {
      pixels = Number(image.value.split(':').at(-1))
    },
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => `snapshot:${pixels}`)
  const { container } = render(
    <DrawingCanvas
      draftKey="undo-regression"
      onSubmit={async () => {}}
      busy={false}
      submitted={false}
    />,
  )
  const canvas = container.querySelector('canvas')!
  canvas.setPointerCapture = vi.fn()
  for (let i = 0; i < 25; i++) {
    fireEvent.pointerDown(canvas, { button: 0, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20 })
    fireEvent.pointerUp(canvas)
  }
  const undo = screen.getByRole('button', { name: 'Undo stroke' }) as HTMLButtonElement
  expect(undo.disabled).toBe(false)
  for (let i = 0; i < 19; i++) fireEvent.click(undo)
  await waitFor(() => expect(undo.disabled).toBe(true))
  expect(pixels).toBeGreaterThan(0)
  expect(
    (screen.getByRole('button', { name: 'Submit drawing' }) as HTMLButtonElement).disabled,
  ).toBe(false)
  expect(storage.get('undo-regression')).toBe(`snapshot:${pixels}`)
})
