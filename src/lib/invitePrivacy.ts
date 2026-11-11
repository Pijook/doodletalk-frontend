import { useSyncExternalStore } from 'react'

const key = 'doodletalk.hideInviteCodes'
function initialValue() {
  try {
    return localStorage.getItem(key) !== 'false'
  } catch {
    return true
  }
}
let hidden = initialValue()
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function useInvitePrivacy() {
  return useSyncExternalStore(subscribe, () => hidden)
}
export function setInviteCodesHidden(value: boolean) {
  hidden = value
  try {
    localStorage.setItem(key, String(value))
  } catch {
    /* Keep the preference in memory. */
  }
  listeners.forEach((listener) => listener())
}
