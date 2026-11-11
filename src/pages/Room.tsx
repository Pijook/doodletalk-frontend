import { t, useLanguage } from '../lib/i18n'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Crown, Eye, LockKeyhole, Pencil, Radio, Users } from 'lucide-react'
import { api, ApiError } from '../lib/api'
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

export default function Room() {
  useLanguage()

  const LABELS = [t('Get ready'), t('Make your mark'), t('The big reveal'), t('Applause')]
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
  const [memberAction, setMemberAction] = useState<{
    id: string
    name: string
    action: 'host' | 'kick'
  } | null>(null)
  const manageMember = useMutation({
    mutationFn: () =>
      memberAction!.action === 'host'
        ? api.transferHost(gameId, memberAction!.id)
        : api.kick(gameId, memberAction!.id),
    onSuccess: async () => {
      setMemberAction(null)
      await refresh()
    },
  })
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
        <Loading label={t('Opening the studio…')} />
      </main>
    )
  if (!room.data || (room.error instanceof ApiError && [403, 404].includes(room.error.status)))
    return (
      <main className="page-width error-page">
        <h1>{t('This studio isn’t available.')}</h1>
        <ErrorNotice error={room.error} />
        <p>{t('Use your invite code to join a room with this guest profile.')}</p>
        <Link to="/" className="button">
          {t('Back to the studio')}
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
  const canTransfer = view.rounds.every((r) => r.state === 'FINISHED')
  function memberButtons(member: { id: string; displayName: string }) {
    return (
      isHost &&
      !view.game.closed && (
        <div className="member-actions">
          <button
            className="icon-button"
            disabled={!canTransfer}
            title={t('Transfer hosting between rounds')}
            aria-label={t('Make {0} host', member.displayName)}
            onClick={() => {
              manageMember.reset()
              setMemberAction({ id: member.id, name: member.displayName, action: 'host' })
            }}
          >
            <Crown size={16} />
          </button>
          <button
            className="icon-button"
            aria-label={t('Kick {0}', member.displayName)}
            onClick={() => {
              manageMember.reset()
              setMemberAction({ id: member.id, name: member.displayName, action: 'kick' })
            }}
          >
            ×
          </button>
        </div>
      )
    )
  }
  return (
    <main className="room-page page-width">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} />
        {t('All rooms')}
      </Link>
      <div className="room-heading">
        <div>
          <div className="eyebrow">{t('YOUR LITTLE CORNER OF CREATIVITY')}</div>
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
                ? t('You’re the host')
                : view.myRole === 'PLAYER'
                  ? t('You’re an artist')
                  : t('You’re in the audience')}
            </span>
            <span className={`connection ${connection}`} role="status">
              <span className="tiny-dot" />
              {connection === 'live'
                ? t('Live updates')
                : connection === 'connecting'
                  ? t('Connecting…')
                  : connection === 'offline'
                    ? t('Offline · reconnecting')
                    : t('Reconnecting…')}
            </span>
          </div>
        </div>
        <div className="invite-codes">
          {isHost && view.game.joinCode && <CopyCode code={view.game.joinCode} role="PLAYER" />}
          <CopyCode code={view.game.viewerCode} role="VIEWER" />
        </div>
      </div>
      {view.game.closed && (
        <Notice tone="info">
          {t('This room is closed. You can still revisit revealed drawings and results.')}
        </Notice>
      )}
      <ErrorNotice error={room.error} />
      <div className="room-layout">
        <div className="round-content">
          <div className="round-toolbar">
            <div>
              <strong>
                {selected
                  ? t('Round {0}', selected.number.toString().padStart(2, '0'))
                  : t('The waiting room')}
              </strong>
              {selected && selected.id !== latest?.id && (
                <span className="history-label">{t('Previous round')}</span>
              )}
            </div>
            {view.rounds.length > 1 && (
              <select
                aria-label={t('Choose round')}
                value={selected?.id || ''}
                onChange={(e) =>
                  setParams(e.target.value === latest?.id ? {} : { round: e.target.value })
                }
              >
                {view.rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {t('Round')} {r.number}
                    {r.id === latest?.id ? t(' · latest') : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <ol className="round-steps" aria-label={t('Round progress')}>
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
          {selected && !round.data && round.isPending && (
            <Loading label={t('Unrolling this round…')} />
          )}
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
              <h2>{t('The good company')}</h2>
              <Users size={19} />
            </div>
            <div className="host-member">
              <span className="avatar host-avatar">
                {view.members.find((m) => m.role === 'ORGANIZER')?.displayName[0].toUpperCase()}
              </span>
              <div>
                <strong>{view.members.find((m) => m.role === 'ORGANIZER')?.displayName}</strong>
                <span>{t('The storyteller')}</span>
              </div>
              <Crown size={17} />
            </div>
            <div className="member-label">
              {t('ARTISTS')}
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
                      {member.id === session.id && <small> {t('(you)')}</small>}
                    </span>
                    <Pencil size={14} />
                    {memberButtons(member)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small-copy">
                {t('A few friends make a great start. Share the room code to invite them.')}
              </p>
            )}
            <details className="audience">
              <summary>
                <Eye size={16} />
                <span>{t('The audience')}</span>
                <strong>{viewers.length}</strong>
              </summary>
              {viewers.length ? (
                <ul className="member-list">
                  {viewers.map((member) => (
                    <li key={member.id}>
                      <span className="avatar small">{member.displayName[0].toUpperCase()}</span>
                      <span>
                        {member.displayName}
                        {member.id === session.id && <small> {t('(you)')}</small>}
                      </span>
                      {memberButtons(member)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small-copy muted">
                  {t('Invite friends to watch and pick their favorite.')}
                </p>
              )}
            </details>
            {round.data && (
              <div className="submission-meter">
                <div>
                  <span>{t('Drawings submitted')}</span>
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
          {isHost && round.data?.submissionStatus && (
            <section className="members-panel">
              <h3>{t('Submission status')}</h3>
              <ul className="submission-status">
                {round.data.submissionStatus.map((player) => (
                  <li key={player.playerId}>
                    <span>{player.displayName}</span>
                    <span>{player.submitted ? t('Submitted') : t('Waiting')}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="room-note">
            <span className="section-icon peach">
              <LockKeyhole size={20} />
            </span>
            <h3>{t('A little mystery makes it better.')}</h3>
            <p>
              {isHost
                ? t(
                    'Keep the original to yourself. Describe shapes, colors, and details — let everyone else connect the dots.',
                  )
                : t(
                    'Don’t peek! Your interpretation is what makes this fun. Keep your creation to yourself until the reveal.',
                  )}
            </p>
            <span className="handwritten">{t('Imperfect is the point.')}</span>
          </section>
          {isHost && !view.game.closed && (
            <button className="close-room" onClick={() => setClosing(true)}>
              {t('Close this room')}
            </button>
          )}
          <button className="close-room" onClick={() => setLeaving(true)}>
            {isHost && !view.game.closed ? t('Close and leave room') : t('Leave room')}
          </button>
        </aside>
      </div>
      {leaving && (
        <Modal
          title={isHost && !view.game.closed ? t('Close and leave room?') : t('Leave this room?')}
          onClose={() => {
            if (!leave.isPending) setLeaving(false)
          }}
        >
          <p>
            {isHost
              ? t(
                  'Leaving as host closes the room for everyone. Submitted drawings and votes are preserved.',
                )
              : t(
                  'You’ll return to the homepage. Submitted drawings and votes stay in the room. You can rejoin with the room code and your current guest profile.',
                )}
          </p>
          <ErrorNotice error={leave.error} />
          <div className="actions">
            <Button
              className="secondary"
              disabled={leave.isPending}
              onClick={() => setLeaving(false)}
            >
              {t('Stay in room')}
            </Button>
            <Button busy={leave.isPending} onClick={() => leave.mutate()}>
              {isHost && !view.game.closed ? t('Close and leave') : t('Leave room')}
            </Button>
          </div>
        </Modal>
      )}
      {memberAction && (
        <Modal
          title={memberAction.action === 'host' ? t('Transfer hosting?') : t('Kick member?')}
          onClose={() => {
            if (!manageMember.isPending) setMemberAction(null)
          }}
        >
          <p>
            <strong>{memberAction.name}</strong>
          </p>
          <p>
            {memberAction.action === 'host'
              ? t(
                  'You will exchange roles with this member. They will control the room and prepare the next image.',
                )
              : t(
                  'This guest will lose access and cannot rejoin with the same guest profile. Existing drawings and votes will remain.',
                )}
          </p>
          <ErrorNotice error={manageMember.error} />
          <div className="actions">
            <Button
              className="secondary"
              disabled={manageMember.isPending}
              onClick={() => setMemberAction(null)}
            >
              {t('Cancel')}
            </Button>
            <Button busy={manageMember.isPending} onClick={() => manageMember.mutate()}>
              {t('Confirm')}
            </Button>
          </div>
        </Modal>
      )}
      {closing && (
        <Modal
          title={t('Wrap up this room?')}
          onClose={() => {
            if (!close.isPending) setClosing(false)
          }}
        >
          <p>
            {t(
              'Closing ends all drawing, voting, and new joins. Revealed rounds stay available, but unfinished drawings remain private.',
            )}
          </p>
          <ErrorNotice error={close.error} />
          <div className="actions">
            <Button
              className="secondary"
              disabled={close.isPending}
              onClick={() => setClosing(false)}
            >
              {t('Keep it open')}
            </Button>
            <Button busy={close.isPending} onClick={() => close.mutate()}>
              {t('Close room')}
            </Button>
          </div>
        </Modal>
      )}
    </main>
  )
}
