export interface Tip {
  id: string
  tipper: string
  amount: string
  creator: string
  time: string
  timestamp: number
}

const STORAGE_KEY = 'novatip_recent_donations'
const EVENT_NAME = 'novatip_new_tip'

export function getRecentTips(): Tip[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    } else {
      // Seed initial data so analytics aren't 0
      const initialTips: Tip[] = [
        { id: '1', tipper: 'inj1x9u...4jf9', amount: '2.5', creator: 'Alice (NFT Artist)', time: '2 hours ago', timestamp: Date.now() - 7200000 },
        { id: '2', tipper: 'inj1p82...8dk2', amount: '0.1', creator: 'Web3 Cafe', time: '5 hours ago', timestamp: Date.now() - 18000000 },
        { id: '3', tipper: 'inj1z7t...9sl3', amount: '5.0', creator: 'Injective Builders', time: '1 day ago', timestamp: Date.now() - 86400000 },
        { id: '4', tipper: 'inj1q6w...2pa9', amount: '1.0', creator: 'DeFi Analyst', time: '1 day ago', timestamp: Date.now() - 90000000 }
      ]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialTips))
      return initialTips
    }
  } catch (e) {
    console.error('Failed to parse tips', e)
  }
  return []
}

export function addTip(tip: Omit<Tip, 'id' | 'time' | 'timestamp'>) {
  if (typeof window === 'undefined') return
  const currentTips = getRecentTips()
  const newTip: Tip = {
    ...tip,
    id: Math.random().toString(36).substring(7),
    time: 'Just now',
    timestamp: Date.now()
  }
  
  const updatedTips = [newTip, ...currentTips].slice(0, 10) // keep last 10
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTips))
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function subscribeToTips(callback: () => void) {
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