import { Block, Page, TextPart, TodoItem } from '../models';
import { renderMarkdownToHtml } from '../markdown/render';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(parts: string | TextPart[] | undefined | null): string {
  if (parts == null || parts === '') return '';
  if (typeof parts === 'string') return escapeHtml(parts);
  if (!Array.isArray(parts) || parts.length === 0) return '';

  return parts
    .map((p) => {
      const t = escapeHtml(p.t);
      if (p.b) return `<strong>${t}</strong>`;
      if (p.i) return `<em>${t}</em>`;
      if (p.c) return `<code class="inline-code">${t}</code>`;
      if (p.l) return `<span class="page-link">${t}</span>`;
      return `<span>${t}</span>`;
    })
    .join('');
}

function calloutIcon(tone: Block['tone']): string {
  switch (tone) {
    case 'warn':
      return '⚠';
    case 'danger':
      return '⛔';
    default:
      return 'ℹ';
  }
}

function blockToHtml(block: Block): string {
  switch (block.type) {
    case 'h1':
      return `<h1 class="doc-h1">${escapeHtml(String(block.text ?? ''))}</h1>`;
    case 'h2':
      return `<h2 class="doc-h2">${escapeHtml(String(block.text ?? ''))}</h2>`;
    case 'h3':
      return `<h3 class="doc-h3">${escapeHtml(String(block.text ?? ''))}</h3>`;
    case 'p':
      return `<p class="doc-p">${renderInline(block.text)}</p>`;
    case 'ul':
      return `<ul class="doc-list">${(block.items ?? [])
        .map((item) => `<li>${escapeHtml(String(item))}</li>`)
        .join('')}</ul>`;
    case 'ol':
      return `<ol class="doc-list doc-list--ol">${(block.items ?? [])
        .map((item) => `<li>${escapeHtml(String(item))}</li>`)
        .join('')}</ol>`;
    case 'todo': {
      const items = (block.items ?? []).map((item) => {
        if (typeof item === 'string') {
          return `<li><span class="todo-box">☐</span><span>${escapeHtml(item)}</span></li>`;
        }
        const todo = item as TodoItem;
        const mark = todo.done ? '☑' : '☐';
        const cls = todo.done ? ' class="is-done"' : '';
        return `<li${cls}><span class="todo-box">${mark}</span><span>${escapeHtml(todo.text)}</span></li>`;
      });
      return `<ul class="doc-todo">${items.join('')}</ul>`;
    }
    case 'callout': {
      const tone = block.tone ?? 'info';
      return `<div class="callout callout--${tone}">
        <div class="callout-icon">${calloutIcon(tone)}</div>
        <div class="callout-body">${renderInline(block.text)}</div>
      </div>`;
    }
    case 'code':
      return `<div class="code-block">
        <div class="code-hd"><span class="code-lang">${escapeHtml(block.lang ?? 'text')}</span></div>
        <pre class="code-pre"><code>${escapeHtml(block.code ?? '')}</code></pre>
      </div>`;
    case 'quote':
      return `<blockquote class="doc-quote">${renderInline(block.text)}</blockquote>`;
    case 'divider':
      return '<hr class="doc-divider" />';
    case 'table': {
      const headers = (block.headers ?? [])
        .map((h) => `<th>${escapeHtml(h)}</th>`)
        .join('');
      const rows = (block.rows ?? [])
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
        )
        .join('');
      return `<div class="doc-table-wrap"><table class="doc-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    case 'image':
      return `<figure class="doc-figure">
        <div class="doc-image-placeholder"><span class="doc-image-label">${escapeHtml(block.placeholder ?? 'Image')}</span></div>
        ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
      </figure>`;
    case 'video':
      return `<figure class="doc-figure">
        <div class="doc-video-placeholder"><span class="doc-video-label">${escapeHtml(block.placeholder ?? 'Video')}</span></div>
        ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
      </figure>`;
    default:
      return '';
  }
}

function blocksBodyHtml(blocks: Block[]): string {
  return blocks.map((b) => `<section class="print-block">${blockToHtml(b)}</section>`).join('');
}

function printStyles(): string {
  return `
    @page { margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #1a1a22;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-doc { max-width: 720px; margin: 0 auto; padding: 8px 0 32px; }
    .print-meta {
      margin: 0 0 6px;
      font-size: 9pt;
      color: #6b7280;
      letter-spacing: 0.02em;
    }
    .print-title {
      margin: 0 0 20px;
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.2;
      color: #111;
    }
    .print-body--md { font-size: 11pt; line-height: 1.65; }
    .print-body--md h1 { font-size: 20pt; margin: 1.2em 0 0.4em; }
    .print-body--md h2 { font-size: 15pt; margin: 1.1em 0 0.35em; }
    .print-body--md h3 { font-size: 12pt; margin: 1em 0 0.3em; }
    .print-body--md p { margin: 0.5em 0; }
    .print-body--md ul, .print-body--md ol { margin: 0.5em 0; padding-left: 1.4em; }
    .print-body--md pre {
      background: #f4f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px 14px;
      overflow-x: auto;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 9pt;
    }
    .print-body--md code {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 0.9em;
      background: #f4f4f6;
      padding: 1px 4px;
      border-radius: 3px;
    }
    .print-body--md table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 10pt; }
    .print-body--md th, .print-body--md td {
      border: 1px solid #e5e7eb;
      padding: 6px 10px;
      text-align: left;
    }
    .print-body--md th { background: #f9fafb; font-weight: 600; }
    .print-block { break-inside: avoid-page; page-break-inside: avoid; }
    .doc-h1 { font-size: 18pt; font-weight: 700; margin: 1.1em 0 0.35em; color: #111; }
    .doc-h2 { font-size: 14pt; font-weight: 600; margin: 1em 0 0.3em; color: #111; }
    .doc-h3 { font-size: 12pt; font-weight: 600; margin: 0.9em 0 0.25em; color: #111; }
    .doc-p { margin: 0.35em 0; font-size: 11pt; }
    .doc-list { margin: 0.35em 0; padding-left: 1.35em; }
    .doc-todo { list-style: none; padding: 0; margin: 0.35em 0; }
    .doc-todo li { display: flex; gap: 8px; margin: 4px 0; align-items: flex-start; }
    .doc-todo li.is-done span:last-child { color: #9ca3af; text-decoration: line-through; }
    .todo-box { flex-shrink: 0; font-size: 11pt; }
    .callout {
      display: flex; gap: 10px; padding: 10px 12px; margin: 0.6em 0;
      border-radius: 6px; border: 1px solid; font-size: 10.5pt;
    }
    .callout--info { background: #eef2ff; border-color: #c7d2fe; }
    .callout--warn { background: #fffbeb; border-color: #fde68a; }
    .callout--danger { background: #fef2f2; border-color: #fecaca; }
    .callout-icon { flex-shrink: 0; }
    .code-block {
      margin: 0.6em 0; border: 1px solid #e5e7eb; border-radius: 6px;
      overflow: hidden; font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 9pt; break-inside: avoid-page;
    }
    .code-hd {
      padding: 4px 10px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;
      font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;
    }
    .code-pre { margin: 0; padding: 12px 14px; white-space: pre-wrap; word-break: break-word; }
    .code-pre code { font-family: inherit; }
    .inline-code {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 0.88em; padding: 1px 4px; background: #f3f4f6;
      border: 1px solid #e5e7eb; border-radius: 3px; color: #be185d;
    }
    .page-link { color: #be185d; text-decoration: underline; }
    .doc-quote {
      margin: 0.6em 0; padding-left: 12px; border-left: 3px solid #d1d5db;
      color: #4b5563; font-style: italic;
    }
    .doc-divider { border: 0; height: 1px; background: #e5e7eb; margin: 1.2em 0; }
    .doc-table-wrap { margin: 0.6em 0; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .doc-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    .doc-table th, .doc-table td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
    .doc-table th { background: #f9fafb; font-weight: 600; font-size: 9pt; text-transform: uppercase; }
    .doc-table tr:last-child td { border-bottom: none; }
    .doc-figure { margin: 0.8em 0; }
    .doc-figure figcaption { font-size: 9pt; color: #6b7280; text-align: center; font-style: italic; margin-top: 6px; }
    .doc-image-placeholder, .doc-video-placeholder {
      min-height: 120px; border: 1px dashed #d1d5db; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      background: #f9fafb; color: #6b7280; font-size: 9pt;
    }
  `;
}

export interface PrintDocumentOptions {
  /** Display name for `page.updatedBy` (e.g. person name instead of id). */
  updatedByLabel?: string;
}

/** Full HTML document for browser print / Save as PDF. */
export function buildPrintDocument(page: Page, options: PrintDocumentOptions = {}): string {
  const metaParts = [
    page.breadcrumb.length > 1 ? escapeHtml(page.breadcrumb.slice(0, -1).join(' / ')) : '',
    page.version != null ? `v${page.version}` : '',
    page.updatedAt ? `Updated ${escapeHtml(page.updatedAt)}` : '',
    options.updatedByLabel || page.updatedBy
      ? `by ${escapeHtml(options.updatedByLabel ?? page.updatedBy)}`
      : '',
  ].filter(Boolean);

  const body =
    page.markdownBody?.trim()
      ? `<div class="print-body print-body--md">${renderMarkdownToHtml(page.markdownBody)}</div>`
      : `<div class="print-body print-body--blocks">${blocksBodyHtml(page.blocks ?? [])}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(page.title)}</title>
  <style>${printStyles()}</style>
</head>
<body>
  <article class="print-doc">
    ${metaParts.length ? `<p class="print-meta">${metaParts.join(' · ')}</p>` : ''}
    <h1 class="print-title">${escapeHtml(page.title)}</h1>
    ${body}
  </article>
</body>
</html>`;
}
