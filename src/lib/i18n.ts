import { useSyncExternalStore } from 'react'
import polish from './pl.json'

export type Language = 'en' | 'pl'
const key = 'doodletalk.language'
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(key)
    if (saved === 'en' || saved === 'pl') return saved
  } catch {
    /* Preferences still work in memory when storage is disabled. */
  }
  return typeof navigator !== 'undefined' && navigator.language.startsWith('pl') ? 'pl' : 'en'
}
let language = initialLanguage()
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function useLanguage() {
  return useSyncExternalStore(subscribe, () => language)
}
export function setLanguage(value: Language) {
  language = value
  document.documentElement.lang = value
  try {
    localStorage.setItem(key, value)
  } catch {
    /* Keep the in-memory preference. */
  }
  listeners.forEach((listener) => listener())
}
if (typeof document !== 'undefined') document.documentElement.lang = language
export function t(english: string, ...values: unknown[]): string {
  const translated =
    language === 'pl' ? ((polish as Record<string, string>)[english] ?? english) : english
  return translated.replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index)] ?? ''))
}
