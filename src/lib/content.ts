/**
 * Extracts plain text from a gateway message content field.
 * Gateway may return:
 *   - string (simple)
 *   - { type: string; text?: string } (single Anthropic content block)
 *   - Array of content blocks
 *
 * Skips non-text blocks (thinking, tool_use, etc.) silently.
 * Strips OpenClaw reply tags like [[reply_to_current]].
 */
type ContentBlock = { type: string; text?: string }

const REPLY_TAG_RE = /\[\[\s*reply_to[^\]]*\]\]/g

function stripTags(s: string): string {
  return s.replace(REPLY_TAG_RE, '').trim()
}

export function extractText(content: unknown): string {
  if (typeof content === 'string') return stripTags(content)
  if (Array.isArray(content)) {
    const text = content
      .filter((b: ContentBlock) => b.type === 'text')
      .map((b: ContentBlock) => b.text ?? '')
      .join('\n')
    return stripTags(text)
  }
  if (content && typeof content === 'object') {
    const b = content as ContentBlock
    if (b.type !== 'text') return ''
    return stripTags(b.text ?? '')
  }
  return String(content ?? '')
}
