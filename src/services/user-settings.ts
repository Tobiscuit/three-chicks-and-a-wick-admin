import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface UserSettings {
  imageStudioSettings: {
    includeSourceImages: boolean;
  };
}

const defaultSettings: UserSettings = {
  imageStudioSettings: {
    includeSourceImages: false,
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
      };
      console.log('[UserSettings] Loaded settings for user:', userId, result);
      return result;
    }
    
    console.log('[UserSettings] No settings found for user:', userId, 'returning defaults');
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
    console.log('[UserSettings] Updating setting for user:', userId, data);
    await setDoc(settingsRef, data, { merge: true });
    console.log('[UserSettings] Setting updated successfully');
  } catch (error) {
    console.error('[UserSettings] Error updating image studio setting:', error);
    throw error;
  }
}
