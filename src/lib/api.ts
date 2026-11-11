import type { Session, Game, GameView, RoundView, Drawing, Results, Ticket, Role } from '../types'
import { t } from './i18n'

export const SESSION_KEY = 'doodletalk.session.v1'
const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
export function loadSession(): Session | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (!value || typeof value !== 'object') return null
    const session = value as Session
    if (
      typeof session.id !== 'string' ||
      typeof session.token !== 'string' ||
      typeof session.displayName !== 'string' ||
      typeof session.expiresAt !== 'string' ||
      !(Date.parse(session.expiresAt) > Date.now())
    )
      return null
    return session
  } catch {
    return null
  }
}
export function apiUrl(path: string) {
  // Never forward a guest's Bearer token to an arbitrary URL from a payload.
  if (!path.startsWith('/api/') || path.startsWith('//') || path.includes('\\'))
    throw new Error('Invalid API path')
  return base + path
}
export function socketUrl(path: string) {
  if (!path.startsWith('/ws?ticket=') || path.includes('\\'))
    throw new Error('Invalid WebSocket path')
  const url = new URL(base + path, window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}
async function checkedFetch(path: string, init: RequestInit = {}, authenticated = true) {
  const headers = new Headers(init.headers)
  const session = loadSession()
  if (authenticated) {
    if (!session) {
      window.dispatchEvent(new Event('session-expired'))
      throw new ApiError('Your guest session expired. Please enter your name again.', 401)
    }
    headers.set('Authorization', `Bearer ${session.token}`)
  }
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(apiUrl(path), { ...init, headers, cache: 'no-store' })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('We couldn’t reach DoodleTalk. Check your connection and try again.', 0)
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as {
      detail?: string
      errors?: string[]
    } | null
    if (response.status === 401 && authenticated) window.dispatchEvent(new Event('session-expired'))
    throw new ApiError(
      problem?.errors?.join('. ') ||
        problem?.detail ||
        (response.status >= 500
          ? 'The server is unavailable. Please try again in a moment.'
          : 'This action could not be completed.'),
      response.status,
    )
  }
  return response
}
async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const response = await checkedFetch(path, init, authenticated)
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>)
}
const json = (method: string, data?: unknown): RequestInit => ({
  method,
  ...(data === undefined ? {} : { body: JSON.stringify(data) }),
})
const roundPath = (game: string, round: string) => `/api/games/${game}/rounds/${round}`
const upload = (file: File) => {
  const form = new FormData()
  form.append('image', file)
  return form
}
export const api = {
  createSession: (displayName: string) =>
    request<Session>('/api/sessions', json('POST', { displayName }), false),
  me: () => request<Omit<Session, 'token'>>('/api/sessions/me'),
  games: (signal?: AbortSignal) => request<Game[]>('/api/games', { signal }),
  createGame: (title: string, maxPlayers: number) =>
    request<Game>('/api/games', json('POST', { title, maxPlayers })),
  join: (joinCode: string, role: Exclude<Role, 'ORGANIZER'>) =>
    request<GameView>('/api/games/join', json('POST', { joinCode, role })),
  game: (id: string, signal?: AbortSignal) => request<GameView>(`/api/games/${id}`, { signal }),
  leave: (id: string) => request<void>(`/api/games/${id}/leave`, json('POST')),
  close: (id: string) => request<void>(`/api/games/${id}/close`, json('POST')),
  transferHost: (id: string, memberId: string) =>
    request<void>(`/api/games/${id}/host`, json('POST', { memberId })),
  kick: (id: string, memberId: string) =>
    request<void>(`/api/games/${id}/members/${memberId}/kick`, json('POST')),
  round: (game: string, round: string, signal?: AbortSignal) =>
    request<RoundView>(roundPath(game, round), { signal }),
  createRound: (game: string, file: File) =>
    request<RoundView>(`/api/games/${game}/rounds`, { method: 'POST', body: upload(file) }),
  command: (game: string, round: string, command: 'start' | 'reveal' | 'finish') =>
    request<void>(`${roundPath(game, round)}/${command}`, json('POST')),
  describe: (game: string, round: string, text: string) =>
    request<void>(`${roundPath(game, round)}/description`, json('PUT', { text })),
  submit: (game: string, round: string, file: File) =>
    request<Drawing>(`${roundPath(game, round)}/drawing`, { method: 'PUT', body: upload(file) }),
  vote: (game: string, round: string, drawingId: string) =>
    request<void>(`${roundPath(game, round)}/vote`, json('PUT', { drawingId })),
  results: (game: string, round: string, signal?: AbortSignal) =>
    request<Results>(`${roundPath(game, round)}/results`, { signal }),
  ticket: (game: string) => request<Ticket>(`/api/games/${game}/ws-ticket`, json('POST')),
  image: async (path: string, signal?: AbortSignal) =>
    (await checkedFetch(path, { signal })).blob(),
}
export function errorMessage(error: unknown): string {
  return t(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
}
