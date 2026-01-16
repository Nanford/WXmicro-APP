/**
 * Lightweight Markdown to HTML Parser for WeChat Mini Program
 * Supports: bold, italic, code, code blocks, headers, lists, links
 */

/**
 * Convert markdown text to HTML for rich-text component
 * @param {string} markdown - Raw markdown text
 * @returns {string} HTML string safe for rich-text component
 */
function parseMarkdown(markdown) {
    if (!markdown || typeof markdown !== 'string') {
        return '';
    }

    let html = markdown;

    // Escape HTML entities to prevent injection
    html = html.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code blocks (must be before inline code)
    // Match ```language\ncode\n``` or ```\ncode\n```
    html = html.replace(/```[\s\S]*?```/g, (match) => {
        const code = match.replace(/^```(\w+)?\n?/, '').replace(/\n?```$/, '');
        return `<pre><code>${code}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers (h1-h6)
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Bold (must be before italic)
    // **text** or __text__
    html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic
    // *text* or _text_ (but not inside words)
    html = html.replace(/(?<!\w)\*([^\*]+)\*(?!\w)/g, '<em>$1</em>');
    html = html.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');

    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');

    // Unordered lists
    html = html.replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>');
    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        return `<ul>${match}</ul>`;
    });

    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
    // Note: This simple regex might conflict with unordered lists
    // For production, you'd want more sophisticated parsing

    // Line breaks
    // Convert double line breaks to paragraphs
    html = html.replace(/\n\n+/g, '</p><p>');

    // Single line breaks to <br>
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
        html = `<p>${html}</p>`;
    }

    return html;
}

/**
 * Alternative: Parse markdown for WeChat rich-text nodes format
 * This returns an array of nodes instead of HTML string
 * Keeping this for future reference, but using HTML string for simplicity
 */
function parseMarkdownToNodes(markdown) {
    // Implementation would return rich-text nodes array
    // Not implemented in this version for simplicity
    return [];
}

module.exports = {
    parseMarkdown,
    parseMarkdownToNodes
};
