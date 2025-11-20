
/**
 * Parses the product description HTML to extract structured data.
 * Supports both DOMParser (browser) and Regex (server/fallback).
 */
export function parseProductDescription(html: string) {
  if (!html) return { scent: 'N/A', vibe: 'N/A', vessel: 'N/A' };

  let scent = 'N/A';
  let vibe = 'N/A';
  let vessel = 'N/A';

  // Try Regex first (works everywhere)
  // Matches "The Scent:" followed by text until the next HTML tag or newline
  const scentRegex = /The Scent:?<\/strong>\s*([^<]+)|The Scent:?\s*([^<\n]+)/i;
  const vibeRegex = /The Vibe:?<\/strong>\s*([^<]+)|The Vibe:?\s*([^<\n]+)/i;
  const vesselRegex = /The Vessel:?<\/strong>\s*([^<]+)|The Vessel:?\s*([^<\n]+)/i;

  const scentMatch = html.match(scentRegex);
  const vibeMatch = html.match(vibeRegex);
  const vesselMatch = html.match(vesselRegex);

  if (scentMatch) scent = (scentMatch[1] || scentMatch[2]).trim();
  if (vibeMatch) vibe = (vibeMatch[1] || vibeMatch[2]).trim();
  if (vesselMatch) vessel = (vesselMatch[1] || vesselMatch[2]).trim();

  return { scent, vibe, vessel };
}
