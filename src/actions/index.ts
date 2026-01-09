/**
 * Actions Module Barrel Export
 * 
 * Centralized exports for all server actions, organized by domain.
 * 
 * 2026 Pattern: Domain-driven action organization
 */

// Authentication
export { checkAuthorization } from './auth-actions';

// AI Image Generation
export { generateImageAction, composeWithGalleryAction } from './ai-actions';

// Gallery
export { getGalleryImagesAction } from './gallery-actions';

// Prefill (temporary storage)
export {
  stashProductPrefillImage,
  resolveProductPrefillImage,
  createPrefillUploadUrl,
} from './prefill-actions';

// AI Product Generation
export {
  generateProductFromImageAction,
  stashAiGeneratedProductAction,
  resolveAiGeneratedProductAction,
  uploadImageAction,
} from './product-generation-actions';
