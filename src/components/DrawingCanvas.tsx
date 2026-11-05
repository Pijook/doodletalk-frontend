import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Download, Eraser, Pencil, RotateCcw, Send, Trash2 } from 'lucide-react'
import { Button, Modal, Notice } from './ui'

const COLORS = ['#283d32', '#7571b5', '#e98468', '#e2b653', '#79a47a', '#69a6c3', '#c175a1']
export function DrawingCanvas({
  draftKey,
  onSubmit,
  busy,
  submitted,
}: {
  draftKey: string
  onSubmit: (file: File) => Promise<void>
  busy: boolean
  submitted: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    drawing = useRef(false)
  const history = useRef<string[]>([])
  const blankSnapshot = useRef('')
  const [color, setColor] = useState(COLORS[0]),
    [size, setSize] = useState(5),
    [eraser, setEraser] = useState(false)
  const [ready, setReady] = useState(false),
    [hasInk, setHasInk] = useState(false),
    [undoCount, setUndoCount] = useState(0)
  const [clearDialog, setClearDialog] = useState(false),
    [error, setError] = useState(''),
    [localBusy, setLocalBusy] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const disabled = busy || localBusy || !ready
  function persist(value?: string) {
    try {
      if (value) sessionStorage.setItem(draftKey, value)
      else sessionStorage.removeItem(draftKey)
    } catch {
      setStorageAvailable(false)
    }
  }
  useEffect(() => {
    const canvas = ref.current!,
      context = canvas.getContext('2d')!
    let disposed = false
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    blankSnapshot.current = canvas.toDataURL('image/png')
    history.current = [blankSnapshot.current]
    let saved: string | null = null
    try {
      saved = sessionStorage.getItem(draftKey)
    } catch {
      setStorageAvailable(false)
    }
    if (saved) {
      const image = new Image()
      image.onload = () => {
        if (disposed) return
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        history.current.push(canvas.toDataURL('image/png'))
        setHasInk(true)
        setUndoCount(1)
        setReady(true)
      }
      image.onerror = () => {
        if (!disposed) setReady(true)
      }
      image.src = saved
    } else setReady(true)
    return () => {
      disposed = true
    }
  }, [draftKey])
  function point(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - bounds.left) * 1000) / bounds.width,
      y: ((event.clientY - bounds.top) * 700) / bounds.height,
    }
  }
  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled || event.button !== 0 || drawing.current) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drawing.current = true
    const context = event.currentTarget.getContext('2d')!,
      p = point(event)
    context.strokeStyle = eraser ? '#ffffff' : color
    context.fillStyle = context.strokeStyle
    context.lineWidth = eraser ? size * 4 : size
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.arc(p.x, p.y, context.lineWidth / 2, 0, Math.PI * 2)
    context.fill()
    context.beginPath()
    context.moveTo(p.x, p.y)
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const context = event.currentTarget.getContext('2d')!,
      p = point(event)
    context.lineTo(p.x, p.y)
    context.stroke()
  }
  function end() {
    if (!drawing.current || !ref.current) return
    drawing.current = false
    const snapshot = ref.current.toDataURL('image/png')
    history.current = [...history.current.slice(-19), snapshot]
    setHasInk(true)
    setUndoCount(history.current.length - 1)
    persist(snapshot)
  }
  function undo() {
    if (history.current.length < 2 || disabled) return
    history.current.pop()
    const snapshot = history.current.at(-1)!,
      image = new Image()
    setReady(false)
    image.onload = () => {
      ref.current?.getContext('2d')?.drawImage(image, 0, 0)
      const containsDrawing = snapshot !== blankSnapshot.current
      setReady(true)
      setUndoCount(history.current.length - 1)
      setHasInk(containsDrawing)
      persist(containsDrawing ? snapshot : undefined)
    }
    image.src = snapshot
  }
  function clear() {
    const canvas = ref.current!,
      context = canvas.getContext('2d')!
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    history.current = [canvas.toDataURL('image/png')]
    setHasInk(false)
    setUndoCount(0)
    persist()
    setClearDialog(false)
  }
  async function file() {
    const blob = await new Promise<Blob | null>((resolve) =>
      ref.current!.toBlob(resolve, 'image/png'),
    )
    if (!blob) throw new Error('Could not export your drawing. Please try again.')
    return new File([blob], 'my-doodle.png', { type: 'image/png' })
  }
  async function submit() {
    setLocalBusy(true)
    setError('')
    try {
      await onSubmit(await file())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your drawing.')
    } finally {
      setLocalBusy(false)
    }
  }
  return (
    <div className="canvas-editor">
      <div className="canvas-toolbar">
        <div className="tool-group">
          <button
            type="button"
            className={`tool ${!eraser ? 'active' : ''}`}
            aria-label="Pencil"
            aria-pressed={!eraser}
            disabled={disabled}
            onClick={() => setEraser(false)}
          >
            <Pencil size={18} />
          </button>
          <button
            type="button"
            className={`tool ${eraser ? 'active' : ''}`}
            aria-label="Eraser"
            aria-pressed={eraser}
            disabled={disabled}
            onClick={() => setEraser(true)}
          >
            <Eraser size={18} />
          </button>
        </div>
        <div className="swatches" aria-label="Pencil colors">
          {COLORS.map((value, index) => (
            <button
              type="button"
              key={value}
              className={`swatch ${color === value && !eraser ? 'selected' : ''}`}
              style={{ backgroundColor: value }}
              aria-label={`${['Charcoal', 'Lavender', 'Coral', 'Gold', 'Green', 'Blue', 'Rose'][index]} pencil`}
              aria-pressed={color === value && !eraser}
              disabled={disabled}
              onClick={() => {
                setColor(value)
                setEraser(false)
              }}
            />
          ))}
        </div>
        <label className="brush-size">
          Size
          <input
            aria-label="Brush size"
            type="range"
            min={2}
            max={24}
            value={size}
            disabled={disabled}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </label>
        <div className="tool-group end">
          <button
            type="button"
            className="tool"
            aria-label="Undo stroke"
            disabled={!undoCount || disabled}
            onClick={undo}
          >
            <RotateCcw size={18} />
          </button>
          <button
            type="button"
            className="tool"
            aria-label="Clear canvas"
            disabled={!hasInk || disabled}
            onClick={() => setClearDialog(true)}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <div className="canvas-wrap">
        <canvas
          ref={ref}
          width={1000}
          height={700}
          aria-label="Your drawing canvas"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
        />
        {!hasInk && (
          <span className="canvas-placeholder">A blank page. A very good beginning.</span>
        )}
      </div>
      <div className="canvas-bottom">
        <small>
          {storageAvailable
            ? 'Draft saved in this tab · your art stays private until reveal'
            : 'Draft saving unavailable · download a copy before leaving'}
        </small>
        <div className="actions">
          <Button
            className="text-button"
            aria-label="Download drawing"
            disabled={!hasInk || disabled}
            onClick={async () => {
              try {
                const drawingFile = await file(),
                  url = URL.createObjectURL(drawingFile),
                  link = document.createElement('a')
                link.href = url
                link.download = 'my-doodle.png'
                link.click()
                setTimeout(() => URL.revokeObjectURL(url), 1000)
              } catch (e) {
                setError(String(e))
              }
            }}
          >
            <Download size={17} />
          </Button>
          <Button
            disabled={!hasInk || disabled}
            busy={busy || localBusy}
            onClick={() => void submit()}
          >
            <Send size={16} />
            {submitted ? 'Update drawing' : 'Submit drawing'}
          </Button>
        </div>
      </div>
      {error && <Notice>{error}</Notice>}
      {clearDialog && (
        <Modal title="A fresh piece of paper?" onClose={() => setClearDialog(false)}>
          <p>
            This clears your local canvas. A drawing you already submitted will stay in the room
            until you replace it.
          </p>
          <div className="actions">
            <Button className="secondary" onClick={() => setClearDialog(false)}>
              Keep drawing
            </Button>
            <Button onClick={clear}>Clear canvas</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
