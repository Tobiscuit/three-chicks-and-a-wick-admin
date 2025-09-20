/**
 * Utility functions for AI-generated content
 */

/**
 * Checks if a string contains HTML tags
 */
export function isHtmlContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  
  // Simple check for HTML tags
  const htmlTagRegex = /<[^>]+>/;
  return htmlTagRegex.test(content);
}

/**
 * Safely extracts text content from HTML
 */
export function extractTextFromHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  // Simple text extraction (remove HTML tags)
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Gets a preview of HTML content (first 100 characters of text)
 */
export function getHtmlPreview(html: string, maxLength: number = 100): string {
  const text = extractTextFromHtml(html);
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Determines the appropriate CSS class for AI content based on context
 */
export function getAIContentClassName(context: 'form' | 'preview' | 'details' | 'compact' = 'form'): string {
  const baseClass = 'ai-generated-content';
  
  switch (context) {
    case 'form':
      return `${baseClass} product-description`;
    case 'preview':
      return `${baseClass} product-description`;
    case 'details':
      return `${baseClass} product-description compact`;
    case 'compact':
      return `${baseClass} compact`;
    default:
      return baseClass;
  }
}
