import { t, useLanguage } from '../lib/i18n'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ImagePlus, LoaderCircle, RefreshCw, X } from 'lucide-react'
import { api } from '../lib/api'
import { Button, Modal, Notice } from './ui'

export function PrivateImage({
  path,
  alt,
  className = '',
  interactive = false,
}: {
  path: string
  alt: string
  className?: string
  interactive?: boolean
}) {
  useLanguage()

  const query = useQuery({
    queryKey: ['image', path],
    queryFn: ({ signal }) => api.image(path, signal),
    staleTime: Infinity,
    gcTime: 60000,
  })
  const [url, setUrl] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [zoom, setZoom] = useState(1)
  useEffect(() => {
    if (!query.data) {
      setUrl('')
      return
    }
    const objectUrl = URL.createObjectURL(query.data)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [query.data])
  if (query.isError)
    return (
      <div className="image-fallback">
        <span>{t('Couldn’t load this image.')}</span>
        <Button className="text-button" onClick={() => void query.refetch()}>
          <RefreshCw size={15} />
          {t('Retry')}
        </Button>
      </div>
    )
  return (
    <div className={`private-image ${className}`}>
      {url ? (
        interactive ? (
          <>
            <button
              className="image-open"
              aria-label={t('Enlarge image')}
              onClick={() => {
                setZoom(1)
                setExpanded(true)
              }}
            >
              <img src={url} alt={alt} />
            </button>
            <a
              className="image-download"
              href={url}
              download={`doodletalk.${query.data?.type === 'image/jpeg' ? 'jpg' : 'png'}`}
            >
              {t('Download image')}
            </a>
          </>
        ) : (
          <img src={url} alt={alt} />
        )
      ) : (
        <LoaderCircle className="spin" aria-label={t('Loading image')} />
      )}
      {expanded && url && (
        <Modal
          title={t('Image preview')}
          onClose={() => setExpanded(false)}
          className="image-dialog"
        >
          <label>
            {t('Zoom')}{' '}
            <input
              type="range"
              min="1"
              max="4"
              step="0.25"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />{' '}
            {Math.round(zoom * 100)}%
          </label>
          <div className="image-viewport">
            <img
              src={url}
              alt={alt}
              style={{ width: `${zoom * 100}%`, maxWidth: 'none', height: 'auto' }}
            />
          </div>
          <a
            className="button secondary"
            href={url}
            download={`doodletalk.${query.data?.type === 'image/jpeg' ? 'jpg' : 'png'}`}
          >
            {t('Download image')}
          </a>
        </Modal>
      )}
    </div>
  )
}

export async function validateImage(file: File) {
  if (!['image/png', 'image/jpeg'].includes(file.type))
    throw new Error(t('Choose a PNG or JPEG image.'))
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw new Error(t('Your image must be smaller than 5 MB.'))
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(t('This image could not be opened. Try another PNG or JPEG.'))
  })
  const invalid =
    bitmap.width > 4096 || bitmap.height > 4096 || bitmap.width * bitmap.height > 16_000_000
  bitmap.close()
  if (invalid) throw new Error(t('Use an image up to 4096 pixels per side and 16 megapixels.'))
}
export function ImagePicker({
  value,
  onChange,
  label = t('Choose an image'),
  disabled = false,
}: {
  value: File | null
  onChange: (file: File | null) => void
  label?: string
  disabled?: boolean
}) {
  useLanguage()

  const input = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(''),
    [error, setError] = useState(''),
    [dragging, setDragging] = useState(false)
  const generation = useRef(0)
  useEffect(() => {
    if (!value) {
      setUrl('')
      return
    }
    const objectUrl = URL.createObjectURL(value)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [value])
  async function choose(file?: File) {
    if (!file || disabled) return
    const current = ++generation.current
    try {
      await validateImage(file)
      if (current === generation.current) {
        onChange(file)
        setError('')
      }
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : t('Invalid image'))
    }
  }
  return (
    <div className="image-picker">
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        accept="image/png,image/jpeg"
        aria-label={label}
        disabled={disabled}
        onChange={(e) => {
          void choose(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className={`dropzone ${dragging ? 'dragging' : ''} ${url ? 'with-preview' : ''}`}
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void choose(e.dataTransfer.files[0])
        }}
      >
        {url ? (
          <>
            <img src={url} alt={t('Selected image preview')} />
            <span className="replace-label">{t('Click to choose a different image')}</span>
          </>
        ) : (
          <>
            <span className="upload-icon">
              <ImagePlus size={28} strokeWidth={1.5} />
            </span>
            <strong>{label}</strong>
            <span>{t('or drop it here')}</span>
            <small>{t('PNG or JPEG · up to 5 MB')}</small>
          </>
        )}
      </button>
      {value && (
        <div className="file-caption">
          <span>{value.name}</span>
          <button
            className="icon-button"
            type="button"
            disabled={disabled}
            aria-label={t('Remove selected image')}
            onClick={() => {
              generation.current++
              onChange(null)
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {error && <Notice>{error}</Notice>}
    </div>
  )
}
