import { cleanup, render, screen, act } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { setLanguage, t, useLanguage } from './i18n'
afterEach(() => {
  cleanup()
  setLanguage('en')
  vi.unstubAllGlobals()
})
it('updates mounted views and persists the chosen language', () => {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key),
    setItem: (key: string, value: string) => storage.set(key, value),
  })
  function Example() {
    useLanguage()
    return <span>{t('Create room')}</span>
  }
  setLanguage('en')
  render(<Example />)
  act(() => setLanguage('pl'))
  expect(screen.getByText('Utwórz pokój')).toBeTruthy()
  expect(document.documentElement.lang).toBe('pl')
  expect(localStorage.getItem('doodletalk.language')).toBe('pl')
  expect(t('Make {0} host', 'Ala')).toBe('Przekaż prowadzenie: Ala')
  act(() => setLanguage('en'))
  expect(screen.getByText('Create room')).toBeTruthy()
})
