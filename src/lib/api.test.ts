import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { api, apiUrl, ApiError, loadSession, SESSION_KEY, socketUrl } from './api'

const session = {
  id: 'guest',
  displayName: 'Alex',
  token: 'test-secret',
  expiresAt: '2099-01-01T00:00:00Z',
}
beforeEach(() => {
  // Node 25 also exposes a localStorage stub; use an isolated browser-like store.
  const entries = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
    clear: () => entries.clear(),
  })
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())
describe('guest session and authenticated API', () => {
  it('ignores corrupted, malformed and expired sessions', () => {
    for (const stored of [
      'not-json',
      '{"token":"invalid"}',
      JSON.stringify({ ...session, expiresAt: '2020-01-01' }),
    ]) {
      localStorage.setItem(SESSION_KEY, stored)
      expect(loadSession()).toBeNull()
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    expect(loadSession()).toEqual(session)
  })
  it('adds Bearer auth only to API requests and handles empty responses', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    expect(await api.close('room')).toBeUndefined()
    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/api/games/room/close')
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer test-secret')
  })
  it('creates a guest without sending another profile’s token', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    vi.mocked(fetch).mockResolvedValue(Response.json(session, { status: 201 }))
    await api.createSession('Alex')
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).has('Authorization')).toBe(false)
  })
  it('preserves multipart boundaries for uploads', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    vi.mocked(fetch).mockResolvedValue(Response.json({ id: 'drawing' }))
    await api.submit('room', 'round', new File(['image'], 'art.png', { type: 'image/png' }))
    const options = vi.mocked(fetch).mock.calls[0][1]
    expect(options?.body).toBeInstanceOf(FormData)
    expect(new Headers(options?.headers).has('Content-Type')).toBe(false)
    expect((options?.body as FormData).get('image')).toBeInstanceOf(File)
  })
  it('expires the session on 401 and exposes useful domain errors', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    const expired = vi.fn()
    window.addEventListener('session-expired', expired)
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ detail: 'Session expired' }, { status: 401 }),
    )
    await expect(api.games()).rejects.toMatchObject({ status: 401, message: 'Session expired' })
    expect(expired).toHaveBeenCalledOnce()
    window.removeEventListener('session-expired', expired)
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ detail: 'Round must be DRAWING' }, { status: 409 }),
    )
    await expect(api.command('game', 'round', 'reveal')).rejects.toThrow('Round must be DRAWING')
  })
  it('rejects untrusted URLs before attaching authentication', () => {
    for (const path of [
      'https://evil.example/api/images',
      '//evil.example/api/images',
      '/ws',
      '/api/\\evil',
    ])
      expect(() => apiUrl(path)).toThrow()
    expect(() => socketUrl('//evil.example/ws?ticket=abc')).toThrow()
    expect(socketUrl('/ws?ticket=abc')).toMatch(/^ws:\/\//)
  })
  it('turns proxy failures into friendly errors and preserves cancellation', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(api.games()).rejects.toBeInstanceOf(ApiError)
    vi.mocked(fetch).mockRejectedValue(new DOMException('cancelled', 'AbortError'))
    await expect(api.games()).rejects.toMatchObject({ name: 'AbortError' })
  })
})
