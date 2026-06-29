/**
 * Preprocesses Markdown text to automatically format plain image links on their own line
 * into Markdown image syntax, making it extremely easy for coaches to embed images.
 */
export const preprocessMarkdown = (text: string): string => {
  if (!text) return '';
  
  // Step 1: Split into lines to do the image block pre-processing
  let processed = text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      
      // Match common image URLs (ending in png, jpg, jpeg, webp, gif, svg)
      // or common image hosting services like Unsplash
      const isImageUrl =
        /^https?:\/\/[^\s]+?\.(jpg|jpeg|png|webp|gif|svg)(\?[^\s]*)?$/i.test(trimmed) ||
        /^https?:\/\/images\.unsplash\.com\/[^\s]+$/i.test(trimmed);
        
      if (isImageUrl) {
        return `![Image Preview](${trimmed})`;
      }
      return line;
    })
    .join('\n');

  // Step 2: Auto-link raw URLs that are not already part of a markdown link [text](url) or image ![alt](url)
  // Match markdown links/images in Group 1, or raw URLs in Group 2
  const pattern = /(!?\[.*?\]\([^\)]+\))|(https?:\/\/[^\s<>\)]+[^<.,:;"')\]\s])/g;
  
  processed = processed.replace(pattern, (match, markdownLinkOrImg, plainUrl) => {
    if (markdownLinkOrImg) {
      // It's already formatted as a markdown link or image, leave it alone
      return match;
    }
    // It's a plain URL, wrap it in a markdown link syntax [url](url)
    return `[${plainUrl}](${plainUrl})`;
  });

  // Step 3: Convert custom [text | url] syntax to [text](url) and ensure the url is absolute
  processed = processed.replace(/\[\s*([^\]|]+?)\s*\|\s*([^\]|]+?)\s*\]/g, (match, textPart, urlPart) => {
    const trimmedUrl = urlPart.trim();
    const hasProtocol = /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(trimmedUrl);
    const absoluteUrl = hasProtocol ? trimmedUrl : `https://${trimmedUrl}`;
    return `[${textPart.trim()}](${absoluteUrl})`;
  });

  // Step 4: Ensure all standard markdown links [text](url) have a protocol if needed
  processed = processed.replace(/\[\s*([^\]]+?)\s*\]\(\s*([^)]+?)\s*\)/g, (match, textPart, urlPart) => {
    const trimmedUrl = urlPart.trim();
    // If it's already an absolute URL or begins with /, #, mailto:, or tel:, keep it
    const hasProtocol = /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(trimmedUrl);
    const absoluteUrl = hasProtocol ? trimmedUrl : `https://${trimmedUrl}`;
    return `[${textPart.trim()}](${absoluteUrl})`;
  });

  return processed;
};

/**
 * Strips Markdown tags from a string to display clean, human-readable plain text snippets
 * inside the listing cards or dashboards.
 */
export const stripMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '') // remove images
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // replace links with just text
    .replace(/[*_#`~>]/g, '') // remove markdown styles, quotes, headers
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .trim();
};
