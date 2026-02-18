/**
 * Extracts plain text from a gateway message content field.
 * Gateway may return:
 *   - string (simple)
 *   - { type: string; text?: string } (single Anthropic content block)
 *   - Array of content blocks
 */
type ContentBlock = { type: string; text?: string }

export function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((b: ContentBlock) =>
        b.type === 'text' ? (b.text ?? '') : `[${b.type}]`,
      )
      .join('\n')
  }
  if (content && typeof content === 'object') {
    const b = content as ContentBlock
    return b.text ?? JSON.stringify(content)
  }
  return String(content ?? '')
}
