import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Markdown → sanitized HTML for in-app rendering (comments, previews).
 */
export function renderMarkdownToHtml(markdown: string): string {
  const src = markdown ?? '';
  if (!src.trim()) return '';
  const raw = marked.parse(src, { async: false }) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
