import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import Home from './Home'
import { setLanguage } from '../lib/i18n'

vi.mock('../lib/auth', () => ({ useAuth: () => ({ session: null, expired: false }) }))
afterEach(cleanup)
function renderJoin(url: string) {
  setLanguage('en')
  render(
    <MemoryRouter initialEntries={[url]}>
      <QueryClientProvider client={new QueryClient()}>
        <Home />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}
it('selects voting from an audience invitation and accepts its full code', () => {
  renderJoin('/?join=V-012345ABCDEF&role=VIEWER')
  const input = screen.getByLabelText('Room code') as HTMLInputElement
  expect(input.value).toBe('V-012345ABCDEF')
  expect(input.checkValidity()).toBe(true)
  expect((screen.getByRole('radio', { name: /Watch & vote/ }) as HTMLInputElement).checked).toBe(
    true,
  )
})
it('updates the role when a code is pasted manually', () => {
  renderJoin('/?join=ABCD2345')
  fireEvent.change(screen.getByLabelText('Room code'), { target: { value: 'v-012345abcdef' } })
  expect((screen.getByRole('radio', { name: /Watch & vote/ }) as HTMLInputElement).checked).toBe(
    true,
  )
  fireEvent.change(screen.getByLabelText('Room code'), { target: { value: 'ABCD2345' } })
  expect((screen.getByRole('radio', { name: /Draw along/ }) as HTMLInputElement).checked).toBe(true)
})
