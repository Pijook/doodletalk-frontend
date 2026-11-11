import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CopyCode } from './ui'
import { setInviteCodesHidden } from '../lib/invitePrivacy'
import { setLanguage } from '../lib/i18n'
import { copyText } from '../lib/clipboard'

vi.mock('../lib/clipboard', () => ({ copyText: vi.fn() }))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
  setInviteCodesHidden(true)
})
it('hides codes but still copies the correct role-specific invitation', async () => {
  setLanguage('en')
  setInviteCodesHidden(true)
  render(<CopyCode code="V-012345ABCDEF" role="VIEWER" />)
  expect(screen.queryByText('V-012345ABCDEF')).toBeNull()
  expect(screen.getByLabelText('Code hidden')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }))
  await waitFor(() =>
    expect(copyText).toHaveBeenCalledWith(
      `${window.location.origin}/?join=V-012345ABCDEF&role=VIEWER`,
    ),
  )
  act(() => setInviteCodesHidden(false))
  expect(screen.getByText('V-012345ABCDEF')).toBeTruthy()
  act(() => setInviteCodesHidden(true))
  expect(screen.queryByText('V-012345ABCDEF')).toBeNull()
})
it('keeps the manual copy fallback masked when clipboard access fails', async () => {
  setLanguage('en')
  setInviteCodesHidden(true)
  vi.mocked(copyText).mockRejectedValue(new Error('denied'))
  render(<CopyCode code="ABCD2345" role="PLAYER" />)
  fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }))
  const field = (await screen.findByLabelText('Copy this invite link:')) as HTMLInputElement
  expect(field.type).toBe('password')
  expect(field.value).toContain('join=ABCD2345&role=PLAYER')
})
