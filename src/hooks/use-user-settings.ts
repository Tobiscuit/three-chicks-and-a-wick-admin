"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { getUserSettings, UserSettings } from '@/services/user-settings'

const defaultSettings: UserSettings = {
  imageStudioSettings: {
    includeSourceImages: false,
  },
  customCandleSettings: {
    enableCustomCandleAI: false,
  },
  productsSettings: {
    enableBulkSelection: true,
  },
  appearance: {
    theme: 'system',
  },
  strategySettings: {
    lastReadAt: null,
  },
}

export function useUserSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const userSettings = await getUserSettings(user.uid)
        setSettings(userSettings)
      } catch (err) {
        console.error('[useUserSettings] Error loading settings:', err)
        setError(err instanceof Error ? err : new Error('Failed to load settings'))
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [user?.uid])

  return {
    settings,
    loading,
    error,
    enableBulkSelection: settings.productsSettings.enableBulkSelection,
    theme: settings.appearance.theme,
    lastReadStrategyAt: settings.strategySettings.lastReadAt,
  }
}
