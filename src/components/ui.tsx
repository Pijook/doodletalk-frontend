import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Check, Copy, LoaderCircle, Pencil, X, AlertCircle } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/api'

export function Button({
  children,
  busy,
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button className={`button ${className}`} disabled={disabled || busy} {...props}>
      {busy && <LoaderCircle size={17} className="spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
export function Notice({
  children,
  tone = 'error',
}: {
  children: ReactNode
  tone?: 'error' | 'info' | 'success'
}) {
  return (
    <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <AlertCircle size={18} />
      <div>{children}</div>
    </div>
  )
}
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? <Notice>{errorMessage(error)}</Notice> : null
}
export function Loading({ label = 'Getting your pencils ready…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={25} />
      <span>{label}</span>
    </div>
  )
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function Header() {
  const { session, signOut } = useAuth()
  const [confirm, setConfirm] = useState(false)
  const navigate = useNavigate()
  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="DoodleTalk home">
          <span className="brand-mark">
            <Pencil size={24} strokeWidth={2.4} />
          </span>
          Doodle<span className="brand-light">Talk</span>
          <span className="brand-dot" aria-hidden="true">
            •
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <Link className="nav-link" to="/">
            The studio <ArrowUpRight size={15} />
          </Link>
          {session ? (
            <button
              className="profile"
              onClick={() => setConfirm(true)}
              aria-label={`Switch guest (${session.displayName})`}
            >
              <span className="avatar small">{session.displayName.slice(0, 1).toUpperCase()}</span>
              <span>{session.displayName}</span>
            </button>
          ) : (
            <span className="header-note">A little less perfect. A lot more fun.</span>
          )}
        </nav>
      </header>
      {confirm && (
        <Modal title="Switch guest?" onClose={() => setConfirm(false)}>
          <p>
            Your guest key lives in this browser. Signing out removes it, so you won’t be able to
            return as <strong>{session?.displayName}</strong> or manage their rooms.
          </p>
          <div className="actions">
            <Button className="secondary" onClick={() => setConfirm(false)}>
              Stay here
            </Button>
            <Button
              onClick={() => {
                signOut()
                setConfirm(false)
                navigate('/')
              }}
            >
              Switch guest
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
export function Footer() {
  return (
    <footer className="site-footer">
      <span>Made for wonderfully different imaginations.</span>
      <span>One description. Your interpretation.</span>
    </footer>
  )
}
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <div>
      <button
        className="room-code"
        aria-label="Copy invite link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${window.location.origin}/?join=${code}`)
            setCopied(true)
            setError(false)
          } catch {
            setError(true)
          }
        }}
      >
        <span>ROOM CODE</span>
        <strong>{code}</strong>
        {copied ? <Check size={18} /> : <Copy size={17} />}
      </button>
      {copied && <small role="status">Invite link copied!</small>}
      {error && <small role="status">Share this code: {code}</small>}
    </div>
  )
}
