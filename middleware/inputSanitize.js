import sanitizeHtml from 'sanitize-html';

/**
 * Strips ALL HTML tags and trims whitespace.
 * Use for titles, names, slugs, and single-line inputs.
 */
export function cleanText(input) {
    if (typeof input !== 'string') return '';
    return sanitizeHtml(input, {
        allowedTags: [],
        allowedAttributes: {}
    }).trim();
}

/**
 * Cleans rich text inputs while preserving basic formatting tags.
 * Use for descriptions, guide steps, and notes.
 */
export function cleanRichText(input) {
    if (typeof input !== 'string') return '';
    return sanitizeHtml(input, {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'br', 'code'],
        allowedAttributes: {
            'a': ['href', 'target', 'rel']
        }
    }).trim();
}