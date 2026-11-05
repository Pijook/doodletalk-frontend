import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Crown, Eye, LockKeyhole, Pencil, Radio, Users } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useRoomConnection } from '../lib/realtime'
import { Button, CopyCode, ErrorNotice, Loading, Modal, Notice } from '../components/ui'
import {
  Gallery,
  HostRound,
  NewRound,
  PlayerRound,
  Waiting,
  useRefreshRoom,
} from '../components/RoundPanels'
import type { RoundState } from '../types'

const STATES: RoundState[] = ['PREPARING', 'DRAWING', 'VOTING', 'FINISHED']
const LABELS = ['Get ready', 'Make your mark', 'The big reveal', 'Applause']
export default function Room() {
  const { gameId = '' } = useParams(),
    { session } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [leaving, setLeaving] = useState(false)
  const leave = useMutation({
    mutationFn: () => api.leave(gameId),
    onSuccess: async () => {
      navigate('/', { replace: true })
      await client.invalidateQueries({ queryKey: ['games'] })
      client.removeQueries({ queryKey: ['game', gameId] })
      client.removeQueries({ queryKey: ['round', gameId] })
      client.removeQueries({ queryKey: ['results', gameId] })
    },
  })
  const [params, setParams] = useSearchParams(),
    [closing, setClosing] = useState(false)
  const room = useQuery({
    queryKey: ['game', gameId],
    queryFn: ({ signal }) => api.game(gameId, signal),
    enabled: !!session && !!gameId,
  })
  const selected =
    room.data?.rounds.find((round) => round.id === params.get('round')) || room.data?.rounds.at(-1)
  const round = useQuery({
    queryKey: ['round', gameId, selected?.id],
    queryFn: ({ signal }) => api.round(gameId, selected!.id, signal),
    enabled: !!session && !!selected,
  })
  const connection = useRoomConnection(gameId, !!session && !!room.data)
  const refresh = useRefreshRoom(gameId)
  const close = useMutation({
    mutationFn: () => api.close(gameId),
    onSuccess: async () => {
      setClosing(false)
      await refresh()
    },
  })
  if (!session) return <Navigate to="/" replace />
  if (room.isPending)
    return (
      <main className="page-width">
        <Loading label="Opening the studio…" />
      </main>
    )
  if (!room.data)
    return (
      <main className="page-width error-page">
        <h1>This studio isn’t available.</h1>
        <ErrorNotice error={room.error} />
        <p>Use your invite code to join a room with this guest profile.</p>
        <Link to="/" className="button">
          Back to the studio
        </Link>
      </main>
    )
  const view = room.data,
    isHost = view.myRole === 'ORGANIZER',
    latest = view.rounds.at(-1)
  const artists = view.members.filter((member) => member.role === 'PLAYER'),
    viewers = view.members.filter((member) => member.role === 'VIEWER')
  const currentState = round.data?.state || selected?.state || 'PREPARING',
    step = STATES.indexOf(currentState)
  return (
    <main className="room-page page-width">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} />
        All rooms
      </Link>
      <div className="room-heading">
        <div>
          <div className="eyebrow">YOUR LITTLE CORNER OF CREATIVITY</div>
          <h1>{view.game.title}</h1>
          <div className="room-subtitle">
            <span className="pill">
              {isHost ? (
                <Crown size={14} />
              ) : view.myRole === 'PLAYER' ? (
                <Pencil size={14} />
              ) : (
                <Eye size={14} />
              )}
              {isHost
                ? 'You’re the host'
                : view.myRole === 'PLAYER'
                  ? 'You’re an artist'
                  : 'You’re in the audience'}
            </span>
            <span className={`connection ${connection}`} role="status">
              <span className="tiny-dot" />
              {connection === 'live'
                ? 'Live updates'
                : connection === 'connecting'
                  ? 'Connecting…'
                  : connection === 'offline'
                    ? 'Offline · reconnecting'
                    : 'Reconnecting…'}
            </span>
          </div>
        </div>
        <CopyCode code={view.game.joinCode} />
      </div>
      {view.game.closed && (
        <Notice tone="info">
          This room is closed. You can still revisit revealed drawings and results.
        </Notice>
      )}
      <ErrorNotice error={room.error} />
      <div className="room-layout">
        <div className="round-content">
          <div className="round-toolbar">
            <div>
              <strong>
                {selected
                  ? `Round ${selected.number.toString().padStart(2, '0')}`
                  : 'The waiting room'}
              </strong>
              {selected && selected.id !== latest?.id && (
                <span className="history-label">Previous round</span>
              )}
            </div>
            {view.rounds.length > 1 && (
              <select
                aria-label="Choose round"
                value={selected?.id || ''}
                onChange={(e) =>
                  setParams(e.target.value === latest?.id ? {} : { round: e.target.value })
                }
              >
                {view.rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    Round {r.number}
                    {r.id === latest?.id ? ' · latest' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <ol className="round-steps" aria-label="Round progress">
            {LABELS.map((label, i) => (
              <li
                key={label}
                className={i === step ? 'current' : i < step ? 'complete' : ''}
                aria-current={i === step ? 'step' : undefined}
              >
                <span>{i < step ? <Check size={13} /> : i + 1}</span>
                <strong>{label}</strong>
              </li>
            ))}
          </ol>
          <ErrorNotice error={round.error} />
          {selected && !round.data && round.isPending && <Loading label="Unrolling this round…" />}
          {!selected &&
            (isHost && !view.game.closed ? (
              <NewRound gameId={gameId} />
            ) : (
              <Waiting role={view.myRole} />
            ))}
          {round.data && (
            <>
              {isHost && <HostRound view={view} round={round.data} />}
              {!isHost && round.data.state === 'PREPARING' && (
                <Waiting round={round.data} role={view.myRole} />
              )}
              {round.data.state === 'DRAWING' && view.myRole === 'PLAYER' && (
                <PlayerRound key={round.data.id} round={round.data} closed={view.game.closed} />
              )}
              {round.data.state === 'DRAWING' && view.myRole === 'VIEWER' && (
                <>
                  <Waiting round={round.data} role={view.myRole} />
                  {round.data.description && (
                    <blockquote className="viewer-description">
                      <Radio size={20} />
                      <p>{round.data.description}</p>
                    </blockquote>
                  )}
                </>
              )}
              {['VOTING', 'FINISHED'].includes(round.data.state) && (
                <Gallery view={view} round={round.data} />
              )}
              {round.data.state === 'FINISHED' &&
                isHost &&
                !view.game.closed &&
                round.data.id === latest?.id && (
                  <NewRound gameId={gameId} next onCreated={() => setParams({})} />
                )}
            </>
          )}
        </div>
        <aside className="room-sidebar">
          <section className="members-panel">
            <div className="sidebar-heading">
              <h2>The good company</h2>
              <Users size={19} />
            </div>
            <div className="host-member">
              <span className="avatar host-avatar">
                {view.members.find((m) => m.role === 'ORGANIZER')?.displayName[0].toUpperCase()}
              </span>
              <div>
                <strong>{view.members.find((m) => m.role === 'ORGANIZER')?.displayName}</strong>
                <span>The storyteller</span>
              </div>
              <Crown size={17} />
            </div>
            <div className="member-label">
              ARTISTS
              <span>
                {artists.length} / {view.game.maxPlayers}
              </span>
            </div>
            {artists.length ? (
              <ul className="member-list">
                {artists.map((member, i) => (
                  <li key={member.id}>
                    <span className="avatar small" data-color={i % 3}>
                      {member.displayName[0].toUpperCase()}
                    </span>
                    <span>
                      {member.displayName}
                      {member.id === session.id && <small> (you)</small>}
                    </span>
                    <Pencil size={14} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small-copy">
                A few friends make a great start. Share the room code to invite them.
              </p>
            )}
            <details className="audience">
              <summary>
                <Eye size={16} />
                <span>The audience</span>
                <strong>{viewers.length}</strong>
              </summary>
              {viewers.length ? (
                <ul className="member-list">
                  {viewers.map((member) => (
                    <li key={member.id}>
                      <span className="avatar small">{member.displayName[0].toUpperCase()}</span>
                      <span>
                        {member.displayName}
                        {member.id === session.id && <small> (you)</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small-copy muted">Invite friends to watch and pick their favorite.</p>
              )}
            </details>
            {round.data && (
              <div className="submission-meter">
                <div>
                  <span>Drawings submitted</span>
                  <strong>
                    {round.data.submittedDrawings}/{round.data.expectedDrawings}
                  </strong>
                </div>
                <progress
                  max={Math.max(1, round.data.expectedDrawings)}
                  value={round.data.submittedDrawings}
                />
              </div>
            )}
          </section>
          <section className="room-note">
            <span className="section-icon peach">
              <LockKeyhole size={20} />
            </span>
            <h3>A little mystery makes it better.</h3>
            <p>
              {isHost
                ? 'Keep the original to yourself. Describe shapes, colors, and details — let everyone else connect the dots.'
                : 'Don’t peek! Your interpretation is what makes this fun. Keep your creation to yourself until the reveal.'}
            </p>
            <span className="handwritten">Imperfect is the point.</span>
          </section>
          {isHost && !view.game.closed && (
            <button className="close-room" onClick={() => setClosing(true)}>
              Close this room
            </button>
          )}
          <button className="close-room" onClick={() => setLeaving(true)}>
            {isHost && !view.game.closed ? 'Close and leave room' : 'Leave room'}
          </button>
        </aside>
      </div>
      {leaving && (
        <Modal
          title={isHost && !view.game.closed ? 'Close and leave room?' : 'Leave this room?'}
          onClose={() => {
            if (!leave.isPending) setLeaving(false)
          }}
        >
          <p>
            {isHost
              ? 'Leaving as host closes the room for everyone. Submitted drawings and votes are preserved.'
              : 'You�ll return to the homepage. Submitted drawings and votes stay in the room. You can rejoin with the room code and your current guest profile.'}
          </p>
          <ErrorNotice error={leave.error} />
          <div className="actions">
            <Button
              className="secondary"
              disabled={leave.isPending}
              onClick={() => setLeaving(false)}
            >
              Stay in room
            </Button>
            <Button busy={leave.isPending} onClick={() => leave.mutate()}>
              {isHost && !view.game.closed ? 'Close and leave' : 'Leave room'}
            </Button>
          </div>
        </Modal>
      )}
      {closing && (
        <Modal
          title="Wrap up this room?"
          onClose={() => {
            if (!close.isPending) setClosing(false)
          }}
        >
          <p>
            Closing ends all drawing, voting, and new joins. Revealed rounds stay available, but
            unfinished drawings remain private.
          </p>
          <ErrorNotice error={close.error} />
          <div className="actions">
            <Button
              className="secondary"
              disabled={close.isPending}
              onClick={() => setClosing(false)}
            >
              Keep it open
            </Button>
            <Button busy={close.isPending} onClick={() => close.mutate()}>
              Close room
            </Button>
          </div>
        </Modal>
      )}
    </main>
  )
}
