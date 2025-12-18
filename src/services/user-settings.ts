import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface UserSettings {
  imageStudioSettings: {
    includeSourceImages: boolean;
  };
  customCandleSettings: {
    enableCustomCandleAI: boolean;
  };
  productsSettings: {
    enableBulkSelection: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'storefront' | 'system';
  };
  strategySettings: {
    lastReadAt: number | null; // Timestamp when user last viewed strategy
  };
}

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
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    const settingsRef = doc(db, 'userSettings', userId);
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      const data = settingsSnap.data();
      const result = {
        imageStudioSettings: {
          includeSourceImages: data.imageStudioSettings?.includeSourceImages ?? defaultSettings.imageStudioSettings.includeSourceImages,
        },
        customCandleSettings: {
          enableCustomCandleAI: data.customCandleSettings?.enableCustomCandleAI ?? defaultSettings.customCandleSettings.enableCustomCandleAI,
        },
        productsSettings: {
          enableBulkSelection: data.productsSettings?.enableBulkSelection ?? defaultSettings.productsSettings.enableBulkSelection,
        },
        appearance: {
          theme: data.appearance?.theme ?? defaultSettings.appearance.theme,
        },
        strategySettings: {
          lastReadAt: data.strategySettings?.lastReadAt ?? defaultSettings.strategySettings.lastReadAt,
        },
      };
      return result;
    }
    
    return defaultSettings;
  } catch (error) {
    console.error('[UserSettings] Error fetching settings:', error);
    return defaultSettings;
  }
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
  try {
    const settingsRef = doc(db, 'userSettings', userId);
    await setDoc(settingsRef, settings, { merge: true });
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
}

export async function updateImageStudioSetting(userId: string, includeSourceImages: boolean): Promise<void> {
  try {
    const settingsRef = doc(db, 'userSettings', userId);
    const data = {
      imageStudioSettings: {
        includeSourceImages,
      },
    };
    await setDoc(settingsRef, data, { merge: true });
  } catch (error) {
    console.error('[UserSettings] Error updating image studio setting:', error);
    throw error;
  }
}

export async function updateCustomCandleSetting(userId: string, enableCustomCandleAI: boolean): Promise<void> {
  try {
    const settingsRef = doc(db, 'userSettings', userId);
    const data = {
      customCandleSettings: {
        enableCustomCandleAI,
      },
    };
    await setDoc(settingsRef, data, { merge: true });
  } catch (error) {
    console.error('Error updating custom candle setting:', error);
    throw error;
  }
}

export async function updateProductsSetting(userId: string, enableBulkSelection: boolean): Promise<void> {
  try {
    const settingsRef = doc(db, 'userSettings', userId);
    const data = {
      productsSettings: {
        enableBulkSelection,
      },
    };
    await setDoc(settingsRef, data, { merge: true });
  } catch (error) {
    console.error('[UserSettings] Error updating products setting:', error);
    throw error;
  }
}

export async function updateAppearanceSetting(userId: string, theme: UserSettings['appearance']['theme']): Promise<void> {
  try {
    const settingsRef = doc(db, 'userSettings', userId);
    const data = {
      appearance: {
        theme,
      },
    };
    await setDoc(settingsRef, data, { merge: true });
  } catch (error) {
    console.error('[UserSettings] Error updating appearance setting:', error);
    throw error;
  }
}

/**
 * Mark strategy as read for a user (stores current timestamp)
 */
export async function markStrategyAsRead(userId: string): Promise<void> {
  try {
    const settingsRef = doc(db, 'userSettings', userId);
    const data = {
      strategySettings: {
        lastReadAt: Date.now(),
      },
    };
    await setDoc(settingsRef, data, { merge: true });
  } catch (error) {
    console.error('[UserSettings] Error marking strategy as read:', error);
    throw error;
  }
}

/**
 * Get the timestamp when user last read the strategy
 */
export async function getLastReadStrategyAt(userId: string): Promise<number | null> {
  try {
    const settingsRef = doc(db, 'userSettings', userId);
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      return settingsSnap.data().strategySettings?.lastReadAt ?? null;
    }
    return null;
  } catch (error) {
    console.error('[UserSettings] Error getting last read strategy:', error);
    return null;
  }
}
