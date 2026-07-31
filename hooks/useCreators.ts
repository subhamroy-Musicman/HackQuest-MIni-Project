'use client'

import { useState, useEffect } from 'react'
import { MOCK_CREATORS, Creator } from '@/lib/creators'

const STORAGE_KEY = 'novatip_custom_creators'

export function useCreators() {
  const [creators, setCreators] = useState<Creator[]>(MOCK_CREATORS)

  const loadCreators = () => {
    if (typeof window === 'undefined') return
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const customCreators = JSON.parse(data)
        setCreators([...MOCK_CREATORS, ...customCreators])
      } else {
        setCreators(MOCK_CREATORS)
      }
    } catch (e) {
      console.error('Failed to load custom creators', e)
    }
  }

  useEffect(() => {
    loadCreators()

    const handleUpdate = () => loadCreators()
    window.addEventListener('novatip_creators_updated', handleUpdate)
    return () => window.removeEventListener('novatip_creators_updated', handleUpdate)
  }, [])

  const addCreator = (creator: Omit<Creator, 'id' | 'totalRaised'>) => {
    if (typeof window === 'undefined') return

    const newCreator: Creator = {
      ...creator,
      id: `custom-${Math.random().toString(36).substring(7)}`,
      totalRaised: '0.0', // newly added creators start with 0
    }

    try {
      const data = localStorage.getItem(STORAGE_KEY)
      const customCreators = data ? JSON.parse(data) : []
      customCreators.push(newCreator)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customCreators))
      
      // Dispatch event so other components (like stats) can update
      window.dispatchEvent(new Event('novatip_creators_updated'))
    } catch (e) {
      console.error('Failed to save custom creator', e)
    }
  }

  return { creators, addCreator }
}