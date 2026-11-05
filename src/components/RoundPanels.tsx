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
          <span className="eyebrow">ONLY YOU WILL SEE IT</span>
          <h2>{next ? 'Another round of imagination?' : 'It starts with a secret image.'}</h2>
        </div>
      </div>
      <p className="muted">
        Choose something fun to describe. Your artists won’t see the original until you reveal their
        creations.
      </p>
      <ImagePicker
        value={file}
        onChange={setFile}
        label="Choose the secret image"
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
        {next ? 'Create next round' : 'Prepare the first round'}
      </Button>
    </section>
  )
}
function DescriptionEditor({ round }: { round: RoundView }) {
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
      <label htmlFor="description">Give them a little direction</label>
      <textarea
        id="description"
        placeholder="A little house beside a tree. The roof is pointed…"
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
        <small>Describe it on your call, or share a written hint.</small>
        <Button
          className="secondary"
          disabled={!dirty}
          busy={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <Send size={15} />
          Share description
        </Button>
      </div>
      <ErrorNotice error={mutation.error} />
    </div>
  )
}
export function HostRound({ view, round }: { view: GameView; round: RoundView }) {
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
              <span className="eyebrow">YOU’RE THE STORYTELLER</span>
              <h2>
                {round.state === 'PREPARING'
                  ? 'A little mystery. A lot of possibility.'
                  : 'Tell them what you see.'}
              </h2>
            </div>
          </div>
          <div className="host-reference">
            {round.referenceImageUrl && (
              <PrivateImage path={round.referenceImageUrl} alt="The secret reference image" />
            )}
            <span className="private-label">
              <LockKeyhole size={13} />
              Only you can see this
            </span>
          </div>
          {round.state === 'PREPARING' ? (
            <div className="host-instructions">
              <p>
                Make sure your artists are on the call. Describe the image without showing it, and
                see where their imaginations go.
              </p>
              <Button
                busy={mutation.isPending}
                disabled={view.game.closed || !view.members.some((m) => m.role === 'PLAYER')}
                onClick={() => mutation.mutate('start')}
              >
                <Play size={17} />
                Start drawing
              </Button>
              {!view.members.some((m) => m.role === 'PLAYER') && (
                <small>Invite at least one artist to start.</small>
              )}
            </div>
          ) : (
            !view.game.closed && (
              <>
                <DescriptionEditor round={round} />
                <div className="reveal-bar">
                  <div>
                    <strong>
                      {round.submittedDrawings} of {round.expectedDrawings} drawings in
                    </strong>
                    <span>You decide when it’s time for the big reveal.</span>
                  </div>
                  <Button disabled={!round.submittedDrawings} onClick={() => setConfirm('reveal')}>
                    <Eye size={18} />
                    Reveal drawings
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
            <strong>The audience has the floor.</strong>
            <span>When everyone has voted, close voting to see the results.</span>
          </div>
          <Button onClick={() => setConfirm('finish')}>
            <Trophy size={18} />
            Finish voting
          </Button>
        </div>
      )}
      {confirm && (
        <Modal
          title={confirm === 'reveal' ? 'Ready for the big reveal?' : 'Let’s see the results?'}
          onClose={() => {
            if (!mutation.isPending) setConfirm(null)
          }}
        >
          <p>
            {confirm === 'reveal'
              ? `${round.submittedDrawings} of ${round.expectedDrawings} artists have submitted. Revealing closes all uploads and opens voting. This can’t be undone.`
              : 'This closes voting for everyone and reveals the final ranking.'}
          </p>
          <ErrorNotice error={mutation.error} />
          <div className="actions">
            <Button
              className="secondary"
              disabled={mutation.isPending}
              onClick={() => setConfirm(null)}
            >
              Not yet
            </Button>
            <Button busy={mutation.isPending} onClick={() => mutation.mutate(confirm)}>
              {confirm === 'reveal' ? 'Reveal now' : 'Show results'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
export function Waiting({ round, role }: { round?: RoundView; role: string }) {
  return (
    <section className="panel waiting-panel">
      <div className="waiting-sketch">
        <Brush size={58} strokeWidth={1} />
        <span className="waiting-spark">✳</span>
      </div>
      <span className="eyebrow">A LITTLE ANTICIPATION</span>
      <h2>
        {!round
          ? 'The next masterpiece is loading.'
          : round.state === 'PREPARING'
            ? 'Pencils at the ready.'
            : 'Good things take a little doodling.'}
      </h2>
      <p>
        {!round
          ? 'Your host is choosing a secret image. Get comfortable — the room will update when it’s ready.'
          : round.state === 'PREPARING'
            ? 'Your host will start the round soon. Join the call and let your imagination warm up.'
            : 'The artists are bringing the description to life. When the host reveals their work, you can pick your favorite.'}
      </p>
      <span className="pill neutral">
        <span className="tiny-dot" />
        {role === 'VIEWER' ? 'Your vote comes after the reveal' : 'Waiting for the host'}
      </span>
    </section>
  )
}
export function PlayerRound({ round, closed }: { round: RoundView; closed: boolean }) {
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
          <span className="eyebrow">TRUST YOUR IMAGINATION</span>
          <h2>Your version of the story.</h2>
        </div>
      </div>
      {round.description ? (
        <blockquote>
          <Mic size={18} />
          <p>{round.description}</p>
        </blockquote>
      ) : (
        <p className="muted">
          Listen to your host on the call. There’s no wrong way to picture it.
        </p>
      )}
      {closed ? (
        <Notice tone="info">The room is closed. No more drawings can be submitted.</Notice>
      ) : (
        <>
          <div className="editor-tabs" role="tablist" aria-label="Drawing method">
            <button role="tab" aria-selected={mode === 'draw'} onClick={() => setMode('draw')}>
              <Brush size={16} />
              Draw here
            </button>
            <button role="tab" aria-selected={mode === 'upload'} onClick={() => setMode('upload')}>
              <Upload size={16} />
              Upload an image
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
                label="Upload your drawing"
              />
              <Button
                className="full"
                disabled={!file}
                busy={mutation.isPending}
                onClick={() => mutation.mutate(file!)}
              >
                <Send size={17} />
                {own ? 'Replace submitted drawing' : 'Submit drawing'}
              </Button>
              <ErrorNotice error={mutation.error} />
            </div>
          )}
        </>
      )}
      {own && (
        <div className="submitted-drawing">
          <PrivateImage path={own.imageUrl} alt="Your submitted drawing" />
          <div>
            <strong>
              <Check size={16} />
              Your drawing is in!
            </strong>
            <p>
              Only you can see it for now.{' '}
              {closed ? '' : 'You can replace it until the host reveals.'}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
export function Gallery({ view, round }: { view: GameView; round: RoundView }) {
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
          {round.state === 'FINISHED' ? 'EVERY INTERPRETATION TELLS A STORY' : 'THE BIG REVEAL'}
        </span>
        <h2>
          {round.state === 'FINISHED' ? 'A round of applause.' : 'Same story. Different worlds.'}
        </h2>
        <p>
          {round.state === 'FINISHED'
            ? `${results.data?.totalVotes ?? '…'} audience ${results.data?.totalVotes === 1 ? 'vote' : 'votes'}. A whole lot of imagination.`
            : canVote
              ? 'Which drawing captured the description best? Choose your favorite.'
              : round.myVote
                ? 'Your vote is in. Enjoy the gallery while everyone makes their pick.'
                : 'Compare the original with every wonderfully different interpretation.'}
        </p>
      </div>
      {round.myVote && (
        <div className="vote-confirmation" role="status">
          <Check size={18} />
          Your vote has been recorded.
        </div>
      )}
      {round.referenceImageUrl && (
        <article className="reference-card">
          <div>
            <span className="eyebrow">THE ORIGINAL</span>
            <h3>Where it all began.</h3>
            {round.description && <p>{round.description}</p>}
            <span className="pill neutral">The host’s secret image</span>
          </div>
          <PrivateImage
            path={round.referenceImageUrl}
            alt="The original reference image, now revealed"
          />
        </article>
      )}
      <ErrorNotice error={results.error} />
      {results.isPending && round.state === 'FINISHED' && (
        <Loading label="Counting the applause…" />
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
                <PrivateImage path={drawing.imageUrl} alt={`${drawing.authorName}’s drawing`} />
                {winner && (
                  <span className="winner-badge">
                    <Trophy size={14} />
                    {results.data?.scores.filter((s) => s.rank === 1).length === 1
                      ? 'Audience favorite'
                      : 'Joint favorite'}
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
                      ? `${score.votes} ${score.votes === 1 ? 'vote' : 'votes'} · Place ${score.rank}`
                      : 'A unique interpretation'}
                  </span>
                </div>
              </div>
              {canVote && (
                <Button className="secondary full" onClick={() => setSelected(drawing.id)}>
                  <Vote size={17} />
                  Vote for this drawing
                </Button>
              )}
              {voted && (
                <div className="your-vote">
                  <Check size={16} />
                  Your pick
                </div>
              )}
            </article>
          )
        })}
      </div>
      {chosen && (
        <Modal
          title={`Vote for ${chosen.authorName}?`}
          onClose={() => {
            if (!vote.isPending) setSelected(null)
          }}
        >
          <PrivateImage
            path={chosen.imageUrl}
            alt={`${chosen.authorName}’s drawing`}
            className="vote-preview"
          />
          <p>You have one vote this round. Once cast, it can’t be changed.</p>
          <ErrorNotice error={vote.error} />
          <div className="actions">
            <Button
              className="secondary"
              disabled={vote.isPending}
              onClick={() => setSelected(null)}
            >
              Keep looking
            </Button>
            <Button busy={vote.isPending} onClick={() => vote.mutate(chosen.id)}>
              <Check size={17} />
              Confirm vote
            </Button>
          </div>
        </Modal>
      )}
    </section>
  )
}
