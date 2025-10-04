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
