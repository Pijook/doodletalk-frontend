import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ArrowUpRight, Brush, Eye, Sparkles, Users } from 'lucide-react'
import { api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button, ErrorNotice, Notice } from '../components/ui'

export default function Home() {
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'host' | 'join'>(params.has('join') ? 'join' : 'host')
  const [name, setName] = useState(''),
    [title, setTitle] = useState(''),
    [maxPlayers, setMaxPlayers] = useState(8)
  const [code, setCode] = useState(params.get('join')?.toUpperCase().slice(0, 8) || '')
  const [role, setRole] = useState<'PLAYER' | 'VIEWER'>('PLAYER')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const { session, expired, ensureSession } = useAuth()
  const navigate = useNavigate(),
    client = useQueryClient()
  const games = useQuery({
    queryKey: ['games', session?.id],
    queryFn: ({ signal }) => api.games(signal),
    enabled: !!session,
  })
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await ensureSession(name)
      const id =
        tab === 'host'
          ? (await api.createGame(title.trim() || 'A little drawing party', maxPlayers)).id
          : (await api.join(code.trim().toUpperCase(), role)).game.id
      void client.invalidateQueries({ queryKey: ['games'] })
      navigate(`/rooms/${id}`)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="simple-home">
      <section className="home-heading">
        <h1>Draw what you hear.</h1>
        <p>One host. A secret image. Everyone’s own masterpiece.</p>
      </section>
      <section className="play-card" aria-label="Play DoodleTalk">
        <div className="entry-card">
          <div className="tabs" role="tablist" aria-label="Choose how to play">
            <button
              role="tab"
              aria-selected={tab === 'host'}
              onClick={() => {
                setTab('host')
                setError('')
              }}
            >
              <Sparkles size={17} />
              Create room
            </button>
            <button
              role="tab"
              aria-selected={tab === 'join'}
              onClick={() => {
                setTab('join')
                setError('')
              }}
            >
              <Users size={18} />
              Join room
            </button>
          </div>
          <form onSubmit={submit} className="entry-form">
            {expired && (
              <Notice tone="info">
                Your guest session expired. Enter your name to start a new one.
              </Notice>
            )}
            {session ? (
              <div className="welcome">
                <span className="avatar">{session.displayName[0].toUpperCase()}</span>
                <div>
                  <small>YOU’RE PLAYING AS</small>
                  <strong>{session.displayName}</strong>
                </div>
              </div>
            ) : (
              <label>
                Your name
                <input
                  autoComplete="nickname"
                  placeholder="What should we call you?"
                  value={name}
                  maxLength={40}
                  required
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            {tab === 'host' ? (
              <details className="room-options">
                <summary>
                  Room settings <span>{maxPlayers} players</span>
                </summary>
                <div className="form-row">
                  <label className="grow">
                    Room name
                    <input
                      placeholder="A little drawing party"
                      maxLength={100}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </label>
                  <label className="capacity">
                    Artists
                    <select
                      aria-label="Maximum players"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    >
                      {[2, 4, 6, 8, 12, 16, 24, 50].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </details>
            ) : (
              <>
                <label>
                  Room code
                  <input
                    className="code-input"
                    placeholder="ABCD2345"
                    autoComplete="off"
                    value={code}
                    maxLength={8}
                    minLength={8}
                    pattern="[A-Za-z2-9]{8}"
                    required
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  />
                </label>
                <fieldset className="role-picker">
                  <legend>I’m here to…</legend>
                  <label className={role === 'PLAYER' ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="role"
                      checked={role === 'PLAYER'}
                      onChange={() => setRole('PLAYER')}
                    />
                    <Brush size={19} />
                    <span>
                      <strong>Draw</strong>
                      <small>Draw along</small>
                    </span>
                  </label>
                  <label className={role === 'VIEWER' ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="role"
                      checked={role === 'VIEWER'}
                      onChange={() => setRole('VIEWER')}
                    />
                    <Eye size={19} />
                    <span>
                      <strong>Watch & vote</strong>
                      <small>Pick your favorite</small>
                    </span>
                  </label>
                </fieldset>
              </>
            )}
            {error && <Notice>{error}</Notice>}
            <Button busy={busy} className="full" type="submit">
              {tab === 'host' ? 'Create room' : 'Join the room'}
              <ArrowRight size={19} />
            </Button>
            <p className="form-note">
              {tab === 'host'
                ? 'Get a room code and invite your friends.'
                : 'Your role stays the same for every round in this room.'}
            </p>
          </form>
        </div>
      </section>
      {session && (
        <section className="your-rooms">
          <div className="section-heading">
            <div>
              <h2>Your rooms</h2>
            </div>
            <span className="count-tag">{games.data?.length ?? '—'}</span>
          </div>
          <ErrorNotice error={games.error} />
          {games.isPending ? (
            <p className="muted">Finding your rooms…</p>
          ) : games.data?.length ? (
            <div className="rooms-grid">
              {games.data.map((game) => (
                <Link className="room-card" to={`/rooms/${game.id}`} key={game.id}>
                  <span className={`status-tag ${game.closed ? 'neutral' : ''}`}>
                    {game.closed ? 'Closed' : 'Open room'}
                  </span>
                  <h3>{game.title}</h3>
                  <div>
                    <span>{game.joinCode}</span>
                    <ArrowUpRight size={22} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">
              Your next drawing party starts above. Rooms you join will appear here.
            </p>
          )}
        </section>
      )}
      <p className="home-help">Hop on a voice call. Describe, draw, reveal, and vote.</p>
    </main>
  )
}
