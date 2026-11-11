import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError, socketUrl } from './api'
import type { GameEvent } from '../types'

export function useRoomConnection(gameId: string, enabled: boolean) {
  const client = useQueryClient()
  const [status, setStatus] = useState<'connecting' | 'live' | 'reconnecting' | 'offline'>(
    'connecting',
  )
  useEffect(() => {
    if (!enabled) return
    let disposed = false,
      socket: WebSocket | undefined,
      attempt = 0,
      highest = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      void client.invalidateQueries({ queryKey: ['game', gameId] })
      void client.invalidateQueries({ queryKey: ['round', gameId] })
      void client.invalidateQueries({ queryKey: ['results', gameId] })
      void client.invalidateQueries({ queryKey: ['games'] })
    }
    function retry() {
      if (disposed) return
      setStatus(navigator.onLine ? 'reconnecting' : 'offline')
      timer = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 15000))
    }
    async function connect() {
      if (disposed) return
      try {
        const ticket = await api.ticket(gameId)
        if (disposed) return
        socket = new WebSocket(socketUrl(ticket.path))
        socket.onmessage = ({ data }) => {
          let event: GameEvent | { type: 'CONNECTED' }
          try {
            event = JSON.parse(String(data))
          } catch {
            return
          }
          if (event.type === 'CONNECTED') {
            attempt = 0
            setStatus('live')
            refresh()
            void client.invalidateQueries({ queryKey: ['image'] })
          } else if ('gameId' in event && event.gameId === gameId && event.sequence > highest) {
            highest = event.sequence
            refresh()
            if (event.type === 'DRAWING_SUBMITTED')
              void client.invalidateQueries({ queryKey: ['image'] })
          }
        }
        socket.onclose = retry
        socket.onerror = () => socket?.close()
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          setStatus('offline')
          refresh()
          return
        }
        retry()
      }
    }
    void connect()
    // Snapshots are authoritative. Polling also covers a missed event or a long-lived broken connection.
    const fallback = setInterval(refresh, 15000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      disposed = true
      clearTimeout(timer)
      clearInterval(fallback)
      window.removeEventListener('focus', onFocus)
      if (socket) {
        socket.onclose = null
        socket.close()
      }
    }
  }, [gameId, enabled, client])
  return status
}
