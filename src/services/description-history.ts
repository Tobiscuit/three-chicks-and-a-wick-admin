// src/services/description-history.ts
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface DescriptionVersion {
  id: string;
  description: string;
  userPrompt?: string;
  reasoning?: string;
  changes: string[];
  timestamp: Date;
}

export interface DescriptionHistory {
  productId: string;
  versions: DescriptionVersion[];
  lastUpdated: Date;
}

const COLLECTION_NAME = 'description_history';

export async function saveDescriptionHistory(
  productId: string, 
  versions: DescriptionVersion[]
): Promise<void> {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc(productId);
    
    const historyData: DescriptionHistory = {
      productId,
      versions: versions.map(v => ({
        ...v,
        timestamp: v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp)
      })),
      lastUpdated: new Date()
    };

    await docRef.set(historyData);
    console.log('[Description History] Saved history for product:', productId, 'versions:', versions.length);
  } catch (error) {
    console.error('[Description History] Error saving history:', error);
    throw error;
  }
}

export async function loadDescriptionHistory(productId: string): Promise<DescriptionVersion[]> {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc(productId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log('[Description History] No history found for product:', productId);
      return [];
    }

    const data = docSnap.data() as DescriptionHistory;
    const versions = data.versions.map(v => ({
      ...v,
      timestamp: v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp)
    }));

    console.log('[Description History] Loaded history for product:', productId, 'versions:', versions.length);
    return versions;
  } catch (error) {
    console.error('[Description History] Error loading history:', error);
    return [];
  }
}

export async function addDescriptionVersion(
  productId: string, 
  version: DescriptionVersion
): Promise<void> {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc(productId);
    
    // Get existing history
    const docSnap = await docRef.get();
    let existingVersions: DescriptionVersion[] = [];
    
    if (docSnap.exists) {
      const data = docSnap.data() as DescriptionHistory;
      existingVersions = data.versions.map(v => ({
        ...v,
        timestamp: v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp)
      }));
    }

    // Add new version
    const updatedVersions = [...existingVersions, version];

    const historyData: DescriptionHistory = {
      productId,
      versions: updatedVersions,
      lastUpdated: new Date()
    };

    await docRef.set(historyData);
    console.log('[Description History] Added version for product:', productId, 'total versions:', updatedVersions.length);
  } catch (error) {
    console.error('[Description History] Error adding version:', error);
    throw error;
  }
}

export async function deleteDescriptionHistory(productId: string): Promise<void> {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc(productId);
    await docRef.delete();
    console.log('[Description History] Deleted history for product:', productId);
  } catch (error) {
    console.error('[Description History] Error deleting history:', error);
    throw error;
  }
}
