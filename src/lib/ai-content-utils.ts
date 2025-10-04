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

/**
 * Formats HTML for better readability in textareas
 * Adds proper indentation and line breaks
 */
export function formatHtmlForEditing(html: string): string {
  if (!html || typeof html !== 'string') return html;
  
  console.log('[formatHtmlForEditing] Input HTML:', html?.substring(0, 200) + '...');
  
  // Add line breaks after closing tags
  let formatted = html
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote|pre)>/gi, '</$1>\n')
    .replace(/<(p|div|h[1-6]|li|ul|ol|blockquote|pre)([^>]*)>/gi, '\n<$1$2>')
    .replace(/<\/(ul|ol)>/gi, '</$1>\n')
    .replace(/<(ul|ol)([^>]*)>/gi, '\n<$1$2>')
    .replace(/<\/(li)>/gi, '</$1>\n')
    .replace(/<(li)([^>]*)>/gi, '  <$1$2>')
    .replace(/<\/(strong|em|code)>/gi, '</$1>')
    .replace(/<(strong|em|code)([^>]*)>/gi, '<$1$2>');
  
  // Clean up multiple newlines
  formatted = formatted
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s*\n/g, '')
    .replace(/\n\s*$/g, '');
  
  console.log('[formatHtmlForEditing] Output HTML:', formatted?.substring(0, 200) + '...');
  
  return formatted;
}

/**
 * Minifies HTML for storage (removes extra whitespace)
 */
export function minifyHtml(html: string): string {
  if (!html || typeof html !== 'string') return html;
  
  return html
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}
