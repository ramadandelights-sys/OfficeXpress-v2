/**
 * Generate SEO-friendly URL slugs from titles
 * Removes emojis, special characters, and creates clean, hyphenated URLs
 */
export function generateSlug(title: string): string {
  if (!title || title.trim() === '') {
    return '';
  }

  return title
    .toLowerCase()
    // Remove emojis using comprehensive Unicode ranges
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu, '')
    // Remove special characters, keep only alphanumeric, spaces, and hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Trim leading/trailing spaces
    .trim()
    // Replace spaces with hyphens
    .replace(/\s/g, '-')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '')
    // Fallback for edge cases (empty result)
    || 'untitled-post';
}
