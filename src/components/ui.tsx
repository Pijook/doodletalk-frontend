import { t, useLanguage, setLanguage } from '../lib/i18n'
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Check, Copy, LoaderCircle, Pencil, X, AlertCircle } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/api'
import { copyText } from '../lib/clipboard'
import { setInviteCodesHidden, useInvitePrivacy } from '../lib/invitePrivacy'

export function Button({
  children,
  busy,
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  useLanguage()

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
  useLanguage()

  return (
    <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <AlertCircle size={18} />
      <div>{children}</div>
    </div>
  )
}
export function ErrorNotice({ error }: { error: unknown }) {
  useLanguage()

  return error ? <Notice>{errorMessage(error)}</Notice> : null
}
export function Loading({ label = t('Getting your pencils ready…') }: { label?: string }) {
  useLanguage()

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
  className,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  className?: string
}) {
  useLanguage()

  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className={className}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label={t('Close dialog')} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function Header() {
  const language = useLanguage()
  const codesHidden = useInvitePrivacy()

  const { session, signOut } = useAuth()
  const [confirm, setConfirm] = useState(false)
  const navigate = useNavigate()
  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand" aria-label={t('DoodleTalk home')}>
          <span className="brand-mark">
            <Pencil size={24} strokeWidth={2.4} />
          </span>
          Doodle<span className="brand-light">Talk</span>
          <span className="brand-dot" aria-hidden="true">
            •
          </span>
        </Link>
        <nav aria-label={t('Main navigation')}>
          <button
            className="invite-privacy"
            aria-pressed={codesHidden}
            onClick={() => setInviteCodesHidden(!codesHidden)}
          >
            {codesHidden ? t('Show invite codes') : t('Hide invite codes')}
          </button>
          <select
            className="language-select"
            aria-label="Language / Język"
            value={language}
            onChange={(e) => setLanguage(e.target.value === 'pl' ? 'pl' : 'en')}
          >
            <option value="en">English</option>
            <option value="pl">Polski</option>
          </select>
          <Link className="nav-link" to="/">
            {t('The studio')} <ArrowUpRight size={15} />
          </Link>
          {session ? (
            <button
              className="profile"
              onClick={() => setConfirm(true)}
              aria-label={t('Switch guest ({0})', session.displayName)}
            >
              <span className="avatar small">{session.displayName.slice(0, 1).toUpperCase()}</span>
              <span>{session.displayName}</span>
            </button>
          ) : (
            <span className="header-note">{t('A little less perfect. A lot more fun.')}</span>
          )}
        </nav>
      </header>
      {confirm && (
        <Modal title={t('Switch guest?')} onClose={() => setConfirm(false)}>
          <p>
            {t(
              'Your guest key lives in this browser. Signing out removes it, so you won’t be able to return as',
            )}{' '}
            <strong>{session?.displayName}</strong> {t('or manage their rooms.')}
          </p>
          <div className="actions">
            <Button className="secondary" onClick={() => setConfirm(false)}>
              {t('Stay here')}
            </Button>
            <Button
              onClick={() => {
                signOut()
                setConfirm(false)
                navigate('/')
              }}
            >
              {t('Switch guest')}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
export function Footer() {
  useLanguage()

  return (
    <footer className="site-footer">
      <span>{t('Made for wonderfully different imaginations.')}</span>
      <span>{t('One description. Your interpretation.')}</span>
    </footer>
  )
}
export function CopyCode({ code, role }: { code: string; role: 'PLAYER' | 'VIEWER' }) {
  useLanguage()
  const hidden = useInvitePrivacy()
  const label = role === 'PLAYER' ? t('Artists code') : t('Voters code')
  const link = `${window.location.origin}/?join=${encodeURIComponent(code)}&role=${role}`

  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <div className="invite-code" role="group" aria-label={label}>
      <button
        className="room-code"
        aria-label={t('Copy invite link')}
        onClick={async () => {
          try {
            await copyText(link)
            setCopied(true)
            setError(false)
          } catch {
            setError(true)
          }
        }}
      >
        <span>{label}</span>
        <strong aria-label={hidden ? t('Code hidden') : undefined}>
          {hidden ? '••••••••' : code}
        </strong>
        {copied ? <Check size={18} /> : <Copy size={17} />}
      </button>
      {copied && <small role="status">{t('Invite link copied!')}</small>}
      {error && (
        <label>
          {t('Copy this invite link:')}
          <input
            readOnly
            type={hidden ? 'password' : 'text'}
            value={link}
            onFocus={(e) => e.target.select()}
          />
        </label>
      )}
    </div>
  )
}
