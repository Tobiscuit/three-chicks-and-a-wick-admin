'use server';

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface TagPool {
  existing_tags: {
    scent_families: string[];
    materials: string[];
    occasions: string[];
    moods: string[];
    seasons: string[];
    brand_values: string[];
    auto_generated: string[]; // For LLM-generated tags
  };
  usage_count: Record<string, number>;
  last_updated: string;
}

export interface SmartTagResult {
  selected_existing: string[];
  new_tags: string[];
  final_tags: string[];
  reasoning: string;
}

// Initialize tag pool with some starter tags
const DEFAULT_TAG_POOL: TagPool = {
  existing_tags: {
    scent_families: ['Floral', 'Woody', 'Citrus', 'Spicy', 'Fresh', 'Warm', 'Earthy', 'Vanilla', 'Lavender', 'Sandalwood'],
    materials: ['Soy Wax', 'Coconut Wax', 'Wooden Wick', 'Cotton Wick', 'Premium Wax', 'Hand Poured'],
    occasions: ['Gift', 'Self Care', 'Meditation', 'Romance', 'Celebration', 'Relaxation', 'Spa Night', 'Date Night'],
    moods: ['Calming', 'Energizing', 'Cozy', 'Luxurious', 'Minimalist', 'Romantic', 'Zen', 'Uplifting'],
    seasons: ['Spring', 'Summer', 'Fall', 'Winter', 'Year Round', 'Holiday'],
    brand_values: ['Handmade', 'Premium', 'Sustainable', 'Artisanal', 'Luxury', 'Eco Friendly'],
    auto_generated: []
  },
  usage_count: {},
  last_updated: new Date().toISOString()
};

export async function getTagPool(): Promise<TagPool> {
  try {
    const doc = await adminDb.collection('tag_pools').doc('candle_tags').get();
    
    if (!doc.exists) {
      // Initialize with default tags
      await adminDb.collection('tag_pools').doc('candle_tags').set(DEFAULT_TAG_POOL);
      return DEFAULT_TAG_POOL;
    }
    
    return doc.data() as TagPool;
  } catch (error) {
    console.error('Error getting tag pool:', error);
    return DEFAULT_TAG_POOL;
  }
}

export async function updateTagPool(tagPool: TagPool): Promise<void> {
  try {
    tagPool.last_updated = new Date().toISOString();
    await adminDb.collection('tag_pools').doc('candle_tags').set(tagPool);
  } catch (error) {
    console.error('Error updating tag pool:', error);
    throw error;
  }
}

export async function saveNewTags(newTags: string[], category: keyof TagPool['existing_tags'] = 'auto_generated'): Promise<void> {
  try {
    const tagPool = await getTagPool();
    
    // Add new tags to appropriate category
    if (!tagPool.existing_tags[category]) {
      tagPool.existing_tags[category] = [];
    }
    
    newTags.forEach(tag => {
      const normalizedTag = tag.trim(); // Keep capitalization
      
      // Check if tag already exists in any category (case-insensitive check)
      const existsInAnyCategory = Object.values(tagPool.existing_tags).some(categoryTags => 
        categoryTags.some(existingTag => existingTag.toLowerCase() === normalizedTag.toLowerCase())
      );
      
      if (!existsInAnyCategory) {
        tagPool.existing_tags[category].push(normalizedTag);
        tagPool.usage_count[normalizedTag] = 1;
      } else {
        // Increment usage count for existing tag
        tagPool.usage_count[normalizedTag] = (tagPool.usage_count[normalizedTag] || 0) + 1;
      }
    });
    
    await updateTagPool(tagPool);
  } catch (error) {
    console.error('Error saving new tags:', error);
    throw error;
  }
}

export async function incrementTagUsage(tags: string[]): Promise<void> {
  try {
    const tagPool = await getTagPool();
    
    tags.forEach(tag => {
      const normalizedTag = tag.trim(); // Keep capitalization
      tagPool.usage_count[normalizedTag] = (tagPool.usage_count[normalizedTag] || 0) + 1;
    });
    
    await updateTagPool(tagPool);
  } catch (error) {
    console.error('Error incrementing tag usage:', error);
    throw error;
  }
}
