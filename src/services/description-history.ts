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

// Helper function to encode product ID for Firestore
function encodeProductId(productId: string): string {
  return productId.replace(/\//g, '__');
}

// Helper function to decode product ID from Firestore
function decodeProductId(encodedId: string): string {
  return encodedId.replace(/__/g, '/');
}

export async function saveDescriptionHistory(
  productId: string, 
  versions: DescriptionVersion[]
): Promise<void> {
  try {
    const encodedId = encodeProductId(productId);
    const docRef = adminDb.collection(COLLECTION_NAME).doc(encodedId);
    
    const historyData: DescriptionHistory = {
      productId,
      versions: versions.map(v => ({
        ...v,
        timestamp: v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp)
      })),
      lastUpdated: new Date()
    };

    await docRef.set(historyData);
  } catch (error) {
    console.error('[Description History] Error saving history:', error);
    throw error;
  }
}

export async function loadDescriptionHistory(productId: string): Promise<DescriptionVersion[]> {
  try {
    const encodedId = encodeProductId(productId);
    const docRef = adminDb.collection(COLLECTION_NAME).doc(encodedId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return [];
    }

    const data = docSnap.data() as DescriptionHistory;
    const versions = data.versions.map(v => ({
      ...v,
      timestamp: v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp)
    }));

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
    const encodedId = encodeProductId(productId);
    const docRef = adminDb.collection(COLLECTION_NAME).doc(encodedId);
    
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
  } catch (error) {
    console.error('[Description History] Error adding version:', error);
    throw error;
  }
}

export async function deleteDescriptionHistory(productId: string): Promise<void> {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc(productId);
    await docRef.delete();
  } catch (error) {
    console.error('[Description History] Error deleting history:', error);
    throw error;
  }
}
