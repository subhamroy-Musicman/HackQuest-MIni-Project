export interface AppNotification {
  id: string
  title: string
  message: string
  timestamp: number
  read: boolean
}

const STORAGE_KEY = 'novatip_notifications'
const EVENT_NAME = 'novatip_new_notification'

export function getNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    } else {
      const initial: AppNotification[] = [
        {
          id: 'welcome',
          title: 'Welcome to NovaTip! 🎉',
          message: 'Set up your creator profile to start receiving INJ tips directly on-chain.',
          timestamp: Date.now(),
          read: false
        }
      ]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
      return initial
    }
  } catch (e) {
    console.error('Failed to parse notifications', e)
  }
  return []
}

export function addNotification(title: string, message: string) {
  if (typeof window === 'undefined') return
  const current = getNotifications()
  const newNotif: AppNotification = {
    id: Math.random().toString(36).substring(7),
    title,
    message,
    timestamp: Date.now(),
    read: false
  }
  
  const updated = [newNotif, ...current].slice(0, 20)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function markAllAsRead() {
  if (typeof window === 'undefined') return
  const current = getNotifications()
  const updated = current.map(n => ({ ...n, read: true }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function subscribeToNotifications(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT_NAME, callback)
  return () => window.removeEventListener(EVENT_NAME, callback)
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}
