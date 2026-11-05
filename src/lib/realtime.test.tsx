import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { api } from './api'
import { useRoomConnection } from './realtime'

class TestSocket {
  static instances: TestSocket[] = []
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  closed = false
  constructor(public url: string) {
    TestSocket.instances.push(this)
  }
  close() {
    this.closed = true
    this.onclose?.()
  }
  message(event: object) {
    this.onmessage?.({ data: JSON.stringify(event) })
  }
}
beforeEach(() => {
  TestSocket.instances = []
  vi.stubGlobal('WebSocket', TestSocket)
  vi.spyOn(api, 'ticket').mockResolvedValue({
    path: '/ws?ticket=test',
    ticket: 'test',
    expiresAt: '',
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { ...renderHook(() => useRoomConnection('game', true), { wrapper }), invalidate }
}
it('refreshes snapshots on connect, ignores duplicate and foreign events, and refreshes replaced images', async () => {
  const { result, invalidate, unmount } = setup()
  await waitFor(() => expect(TestSocket.instances).toHaveLength(1))
  const socket = TestSocket.instances[0]
  act(() => socket.message({ type: 'CONNECTED' }))
  expect(result.current).toBe('live')
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['image'] })
  invalidate.mockClear()
  act(() => socket.message({ gameId: 'game', sequence: 2, type: 'DRAWING_SUBMITTED' }))
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['round', 'game'] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['image'] })
  invalidate.mockClear()
  act(() => {
    socket.message({ gameId: 'game', sequence: 2, type: 'DRAWING_SUBMITTED' })
    socket.message({ gameId: 'other', sequence: 3, type: 'ROUND_REVEALED' })
  })
  expect(invalidate).not.toHaveBeenCalled()
  unmount()
  expect(socket.closed).toBe(true)
})
it('requests a fresh one-time ticket after disconnect', async () => {
  const { result } = setup()
  await waitFor(() => expect(TestSocket.instances).toHaveLength(1))
  vi.useFakeTimers()
  act(() => TestSocket.instances[0].close())
  expect(result.current).toBe('reconnecting')
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000)
  })
  expect(api.ticket).toHaveBeenCalledTimes(2)
  expect(TestSocket.instances).toHaveLength(2)
})
