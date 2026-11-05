import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ImagePlus, LoaderCircle, RefreshCw, X } from 'lucide-react'
import { api } from '../lib/api'
import { Button, Notice } from './ui'

export function PrivateImage({
  path,
  alt,
  className = '',
}: {
  path: string
  alt: string
  className?: string
}) {
  const query = useQuery({
    queryKey: ['image', path],
    queryFn: ({ signal }) => api.image(path, signal),
    staleTime: Infinity,
    gcTime: 60000,
  })
  const [url, setUrl] = useState('')
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
        <span>Couldn’t load this image.</span>
        <Button className="text-button" onClick={() => void query.refetch()}>
          <RefreshCw size={15} />
          Retry
        </Button>
      </div>
    )
  return (
    <div className={`private-image ${className}`}>
      {url ? (
        <img src={url} alt={alt} />
      ) : (
        <LoaderCircle className="spin" aria-label="Loading image" />
      )}
    </div>
  )
}

export async function validateImage(file: File) {
  if (!['image/png', 'image/jpeg'].includes(file.type))
    throw new Error('Choose a PNG or JPEG image.')
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw new Error('Your image must be smaller than 5 MB.')
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('This image could not be opened. Try another PNG or JPEG.')
  })
  const invalid =
    bitmap.width > 4096 || bitmap.height > 4096 || bitmap.width * bitmap.height > 16_000_000
  bitmap.close()
  if (invalid) throw new Error('Use an image up to 4096 pixels per side and 16 megapixels.')
}
export function ImagePicker({
  value,
  onChange,
  label = 'Choose an image',
  disabled = false,
}: {
  value: File | null
  onChange: (file: File | null) => void
  label?: string
  disabled?: boolean
}) {
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
      if (current === generation.current) setError(e instanceof Error ? e.message : 'Invalid image')
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
            <img src={url} alt="Selected image preview" />
            <span className="replace-label">Click to choose a different image</span>
          </>
        ) : (
          <>
            <span className="upload-icon">
              <ImagePlus size={28} strokeWidth={1.5} />
            </span>
            <strong>{label}</strong>
            <span>or drop it here</span>
            <small>PNG or JPEG · up to 5 MB</small>
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
            aria-label="Remove selected image"
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
