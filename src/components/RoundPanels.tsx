import { t, useLanguage } from '../lib/i18n'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Brush,
  Check,
  Eye,
  ImagePlus,
  LockKeyhole,
  Mic,
  Play,
  Send,
  Sparkles,
  Trophy,
  Upload,
  Vote,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { GameView, RoundView } from '../types'
import { Button, ErrorNotice, Loading, Modal, Notice } from './ui'
import { ImagePicker, PrivateImage } from './Images'
import { DrawingCanvas } from './DrawingCanvas'

export function useRefreshRoom(gameId: string) {
  const client = useQueryClient()
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['game', gameId] }),
      client.invalidateQueries({ queryKey: ['round', gameId] }),
      client.invalidateQueries({ queryKey: ['results', gameId] }),
      client.invalidateQueries({ queryKey: ['games'] }),
    ])
  }
}
export function NewRound({
  gameId,
  next = false,
  onCreated,
}: {
  gameId: string
  next?: boolean
  onCreated?: () => void
}) {
  useLanguage()

  const [file, setFile] = useState<File | null>(null)
  const refresh = useRefreshRoom(gameId)
  const mutation = useMutation({
    mutationFn: () => api.createRound(gameId, file!),
    onSuccess: async () => {
      setFile(null)
      await refresh()
      onCreated?.()
    },
  })
  return (
    <section className="panel new-round">
      <div className="panel-heading">
        <span className="section-icon lilac">
          <ImagePlus size={22} />
        </span>
        <div>
          <span className="eyebrow">{t('ONLY YOU WILL SEE IT')}</span>
          <h2>{next ? t('Another round of imagination?') : t('It starts with a secret image.')}</h2>
        </div>
      </div>
      <p className="muted">
        {t(
          'Choose something fun to describe. Your artists won’t see the original until you reveal their creations.',
        )}
      </p>
      <ImagePicker
        value={file}
        onChange={setFile}
        label={t('Choose the secret image')}
        disabled={mutation.isPending}
      />
      <ErrorNotice error={mutation.error} />
      <Button
        className="full"
        disabled={!file}
        busy={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        <Sparkles size={17} />
        {next ? t('Create next round') : t('Prepare the first round')}
      </Button>
    </section>
  )
}
function DescriptionEditor({ round }: { round: RoundView }) {
  useLanguage()

  const [text, setText] = useState(round.description),
    [dirty, setDirty] = useState(false)
  const refresh = useRefreshRoom(round.gameId)
  const mutation = useMutation({
    mutationFn: () => api.describe(round.gameId, round.id, text),
    onSuccess: async () => {
      setDirty(false)
      await refresh()
    },
  })
  useEffect(() => {
    if (!dirty) setText(round.description)
  }, [round.description, dirty])
  return (
    <div className="description-editor">
      <label htmlFor="description">{t('Give them a little direction')}</label>
      <textarea
        id="description"
        placeholder={t('A little house beside a tree. The roof is pointed…')}
        maxLength={4000}
        rows={3}
        value={text}
        disabled={mutation.isPending}
        onChange={(e) => {
          setText(e.target.value)
          setDirty(true)
        }}
      />
      <div className="description-footer">
        <small>{t('Describe it on your call, or share a written hint.')}</small>
        <Button
          className="secondary"
          disabled={!dirty}
          busy={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <Send size={15} />
          {t('Share description')}
        </Button>
      </div>
      <ErrorNotice error={mutation.error} />
    </div>
  )
}
export function HostRound({ view, round }: { view: GameView; round: RoundView }) {
  useLanguage()

  const refresh = useRefreshRoom(round.gameId)
  const [confirm, setConfirm] = useState<'reveal' | 'finish' | null>(null)
  const mutation = useMutation({
    mutationFn: (command: 'start' | 'reveal' | 'finish') =>
      api.command(round.gameId, round.id, command),
    onSuccess: async () => {
      setConfirm(null)
      await refresh()
    },
  })
  return (
    <>
      {['PREPARING', 'DRAWING'].includes(round.state) && (
        <section className="panel host-panel">
          <div className="panel-heading">
            <span className="section-icon green">
              <Mic size={22} />
            </span>
            <div>
              <span className="eyebrow">{t('YOU’RE THE STORYTELLER')}</span>
              <h2>
                {round.state === 'PREPARING'
                  ? t('A little mystery. A lot of possibility.')
                  : t('Tell them what you see.')}
              </h2>
            </div>
          </div>
          <div className="host-reference">
            {round.referenceImageUrl && (
              <PrivateImage path={round.referenceImageUrl} alt={t('The secret reference image')} />
            )}
            <span className="private-label">
              <LockKeyhole size={13} />
              {t('Only you can see this')}
            </span>
          </div>
          {round.state === 'PREPARING' ? (
            <div className="host-instructions">
              <p>
                {t(
                  'Make sure your artists are on the call. Describe the image without showing it, and see where their imaginations go.',
                )}
              </p>
              <Button
                busy={mutation.isPending}
                disabled={view.game.closed || !view.members.some((m) => m.role === 'PLAYER')}
                onClick={() => mutation.mutate('start')}
              >
                <Play size={17} />
                {t('Start drawing')}
              </Button>
              {!view.members.some((m) => m.role === 'PLAYER') && (
                <small>{t('Invite at least one artist to start.')}</small>
              )}
            </div>
          ) : (
            !view.game.closed && (
              <>
                <DescriptionEditor round={round} />
                <div className="reveal-bar">
                  <div>
                    <strong>
                      {round.submittedDrawings} {t('of')} {round.expectedDrawings}{' '}
                      {t('drawings in')}
                    </strong>
                    <span>{t('You decide when it’s time for the big reveal.')}</span>
                  </div>
                  <Button disabled={!round.submittedDrawings} onClick={() => setConfirm('reveal')}>
                    <Eye size={18} />
                    {t('Reveal drawings')}
                  </Button>
                </div>
              </>
            )
          )}
          <ErrorNotice error={mutation.error} />
        </section>
      )}
      {round.state === 'VOTING' && !view.game.closed && (
        <div className="voting-host-bar">
          <div>
            <strong>{t('The audience has the floor.')}</strong>
            <span>{t('When everyone has voted, close voting to see the results.')}</span>
          </div>
          <Button onClick={() => setConfirm('finish')}>
            <Trophy size={18} />
            {t('Finish voting')}
          </Button>
        </div>
      )}
      {confirm && (
        <Modal
          title={
            confirm === 'reveal' ? t('Ready for the big reveal?') : t('Let’s see the results?')
          }
          onClose={() => {
            if (!mutation.isPending) setConfirm(null)
          }}
        >
          <p>
            {confirm === 'reveal'
              ? t(
                  '{0} of {1} artists have submitted. Revealing closes all uploads and opens voting. This can’t be undone.',
                  round.submittedDrawings,
                  round.expectedDrawings,
                )
              : t('This closes voting for everyone and reveals the final ranking.')}
          </p>
          <ErrorNotice error={mutation.error} />
          <div className="actions">
            <Button
              className="secondary"
              disabled={mutation.isPending}
              onClick={() => setConfirm(null)}
            >
              {t('Not yet')}
            </Button>
            <Button busy={mutation.isPending} onClick={() => mutation.mutate(confirm)}>
              {confirm === 'reveal' ? t('Reveal now') : t('Show results')}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
export function Waiting({ round, role }: { round?: RoundView; role: string }) {
  useLanguage()

  return (
    <section className="panel waiting-panel">
      <div className="waiting-sketch">
        <Brush size={58} strokeWidth={1} />
        <span className="waiting-spark">✳</span>
      </div>
      <span className="eyebrow">{t('A LITTLE ANTICIPATION')}</span>
      <h2>
        {!round
          ? t('The next masterpiece is loading.')
          : round.state === 'PREPARING'
            ? t('Pencils at the ready.')
            : t('Good things take a little doodling.')}
      </h2>
      <p>
        {!round
          ? t(
              'Your host is choosing a secret image. Get comfortable — the room will update when it’s ready.',
            )
          : round.state === 'PREPARING'
            ? t(
                'Your host will start the round soon. Join the call and let your imagination warm up.',
              )
            : t(
                'The artists are bringing the description to life. When the host reveals their work, you can pick your favorite.',
              )}
      </p>
      <span className="pill neutral">
        <span className="tiny-dot" />
        {role === 'VIEWER' ? t('Your vote comes after the reveal') : t('Waiting for the host')}
      </span>
    </section>
  )
}
export function PlayerRound({ round, closed }: { round: RoundView; closed: boolean }) {
  useLanguage()

  const { session } = useAuth(),
    client = useQueryClient()
  const [mode, setMode] = useState<'draw' | 'upload'>('draw'),
    [file, setFile] = useState<File | null>(null)
  const refresh = useRefreshRoom(round.gameId)
  const own = round.drawings.find((d) => d.authorId === session?.id)
  const mutation = useMutation({
    mutationFn: (file: File) => api.submit(round.gameId, round.id, file),
    onSuccess: async () => {
      setFile(null)
      await client.invalidateQueries({ queryKey: ['image'] })
      await refresh()
    },
  })
  return (
    <section className="panel artist-panel">
      <div className="panel-heading">
        <span className="section-icon lilac">
          <Brush size={22} />
        </span>
        <div>
          <span className="eyebrow">{t('TRUST YOUR IMAGINATION')}</span>
          <h2>{t('Your version of the story.')}</h2>
        </div>
      </div>
      {round.description ? (
        <blockquote>
          <Mic size={18} />
          <p>{round.description}</p>
        </blockquote>
      ) : (
        <p className="muted">
          {t('Listen to your host on the call. There’s no wrong way to picture it.')}
        </p>
      )}
      {closed ? (
        <Notice tone="info">{t('The room is closed. No more drawings can be submitted.')}</Notice>
      ) : (
        <>
          <div className="editor-tabs" role="tablist" aria-label={t('Drawing method')}>
            <button role="tab" aria-selected={mode === 'draw'} onClick={() => setMode('draw')}>
              <Brush size={16} />
              {t('Draw here')}
            </button>
            <button role="tab" aria-selected={mode === 'upload'} onClick={() => setMode('upload')}>
              <Upload size={16} />
              {t('Upload an image')}
            </button>
          </div>
          {mode === 'draw' ? (
            <DrawingCanvas
              draftKey={`doodletalk.draft.${session!.id}.${round.id}`}
              busy={mutation.isPending}
              submitted={!!own}
              onSubmit={async (value) => {
                await mutation.mutateAsync(value)
              }}
            />
          ) : (
            <div className="upload-drawing">
              <ImagePicker
                value={file}
                onChange={setFile}
                disabled={mutation.isPending}
                label={t('Upload your drawing')}
              />
              <Button
                className="full"
                disabled={!file}
                busy={mutation.isPending}
                onClick={() => mutation.mutate(file!)}
              >
                <Send size={17} />
                {own ? t('Replace submitted drawing') : t('Submit drawing')}
              </Button>
              <ErrorNotice error={mutation.error} />
            </div>
          )}
        </>
      )}
      {own && (
        <div className="submitted-drawing">
          <PrivateImage path={own.imageUrl} alt={t('Your submitted drawing')} />
          <div>
            <strong>
              <Check size={16} />
              {t('Your drawing is in!')}
            </strong>
            <p>
              {t('Only you can see it for now.')}{' '}
              {closed ? '' : t('You can replace it until the host reveals.')}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
export function Gallery({ view, round }: { view: GameView; round: RoundView }) {
  useLanguage()

  const refresh = useRefreshRoom(round.gameId)
  const [selected, setSelected] = useState<string | null>(null)
  const results = useQuery({
    queryKey: ['results', round.gameId, round.id],
    queryFn: ({ signal }) => api.results(round.gameId, round.id, signal),
    enabled: round.state === 'FINISHED',
  })
  const vote = useMutation({
    mutationFn: (drawingId: string) => api.vote(round.gameId, round.id, drawingId),
    onSuccess: async () => {
      setSelected(null)
      await refresh()
    },
  })
  const canVote =
    view.myRole === 'VIEWER' && round.state === 'VOTING' && !round.myVote && !view.game.closed
  useEffect(() => {
    if (!canVote) setSelected(null)
  }, [canVote])
  const scores = new Map(results.data?.scores.map((score) => [score.drawingId, score]))
  const drawings = [...round.drawings].sort(
    (a, b) => (scores.get(a.id)?.rank ?? 0) - (scores.get(b.id)?.rank ?? 0),
  )
  const chosen = round.drawings.find((d) => d.id === selected)
  return (
    <section className="gallery-section">
      <div className="gallery-heading">
        <span className="eyebrow">
          {round.state === 'FINISHED'
            ? t('EVERY INTERPRETATION TELLS A STORY')
            : t('THE BIG REVEAL')}
        </span>
        <h2>
          {round.state === 'FINISHED'
            ? t('A round of applause.')
            : t('Same story. Different worlds.')}
        </h2>
        <p>
          {round.state === 'FINISHED'
            ? t(
                '{0} audience {1}. A whole lot of imagination.',
                results.data?.totalVotes ?? '…',
                results.data?.totalVotes === 1 ? 'vote' : 'votes',
              )
            : canVote
              ? t('Which drawing captured the description best? Choose your favorite.')
              : round.myVote
                ? t('Your vote is in. Enjoy the gallery while everyone makes their pick.')
                : t('Compare the original with every wonderfully different interpretation.')}
        </p>
      </div>
      {round.myVote && (
        <div className="vote-confirmation" role="status">
          <Check size={18} />
          {t('Your vote has been recorded.')}
        </div>
      )}
      {round.referenceImageUrl && (
        <article className="reference-card">
          <div>
            <span className="eyebrow">{t('THE ORIGINAL')}</span>
            <h3>{t('Where it all began.')}</h3>
            {round.description && <p>{round.description}</p>}
            <span className="pill neutral">{t('The host’s secret image')}</span>
          </div>
          <PrivateImage
            path={round.referenceImageUrl}
            alt={t('The original reference image, now revealed')}
            interactive
          />
        </article>
      )}
      <ErrorNotice error={results.error} />
      {results.isPending && round.state === 'FINISHED' && (
        <Loading label={t('Counting the applause…')} />
      )}
      <div className="gallery-grid">
        {drawings.map((drawing, index) => {
          const score = scores.get(drawing.id),
            voted = round.myVote === drawing.id
          const winner = score?.rank === 1 && (results.data?.totalVotes ?? 0) > 0
          return (
            <article
              className={`drawing-card ${voted ? 'voted' : ''} ${winner ? 'winner' : ''}`}
              key={drawing.id}
            >
              <div className="drawing-image">
                <PrivateImage
                  path={drawing.imageUrl}
                  alt={t('{0}’s drawing', drawing.authorName)}
                  interactive
                />
                {winner && (
                  <span className="winner-badge">
                    <Trophy size={14} />
                    {results.data?.scores.filter((s) => s.rank === 1).length === 1
                      ? t('Audience favorite')
                      : t('Joint favorite')}
                  </span>
                )}
              </div>
              <div className="drawing-info">
                <span className="avatar" data-color={index % 3}>
                  {drawing.authorName.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <h3>{drawing.authorName}</h3>
                  <span>
                    {score
                      ? t(
                          '{0} {1} · Place {2}',
                          score.votes,
                          score.votes === 1 ? 'vote' : 'votes',
                          score.rank,
                        )
                      : t('A unique interpretation')}
                  </span>
                </div>
              </div>
              {canVote && (
                <Button className="secondary full" onClick={() => setSelected(drawing.id)}>
                  <Vote size={17} />
                  {t('Vote for this drawing')}
                </Button>
              )}
              {voted && (
                <div className="your-vote">
                  <Check size={16} />
                  {t('Your pick')}
                </div>
              )}
            </article>
          )
        })}
      </div>
      {chosen && (
        <Modal
          title={t('Vote for {0}?', chosen.authorName)}
          onClose={() => {
            if (!vote.isPending) setSelected(null)
          }}
        >
          <PrivateImage
            path={chosen.imageUrl}
            alt={t('{0}’s drawing', chosen.authorName)}
            className="vote-preview"
          />
          <p>{t('You have one vote this round. Once cast, it can’t be changed.')}</p>
          <ErrorNotice error={vote.error} />
          <div className="actions">
            <Button
              className="secondary"
              disabled={vote.isPending}
              onClick={() => setSelected(null)}
            >
              {t('Keep looking')}
            </Button>
            <Button busy={vote.isPending} onClick={() => vote.mutate(chosen.id)}>
              <Check size={17} />
              {t('Confirm vote')}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  )
}
