export type MarkdownFormatAction =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'codeBlock'
  | 'link'
  | 'heading'
  | 'bulletList'
  | 'numberedList'
  | 'quote'
  | 'hr';

export interface MarkdownEditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export function applyMarkdownFormat(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  action: MarkdownFormatAction,
): MarkdownEditResult {
  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));
  const selected = text.slice(start, end);

  switch (action) {
    case 'bold':
      return wrap(text, start, end, '**', '**', 'bold text');
    case 'italic':
      return wrap(text, start, end, '*', '*', 'italic text');
    case 'strike':
      return wrap(text, start, end, '~~', '~~', 'strikethrough');
    case 'code':
      return selected.includes('\n')
        ? wrap(text, start, end, '```\n', '\n```', 'code')
        : wrap(text, start, end, '`', '`', 'code');
    case 'codeBlock':
      return wrap(text, start, end, '```\n', '\n```', 'code');
    case 'link': {
      const label = selected || 'link text';
      const inserted = `[${label}](url)`;
      const value = text.slice(0, start) + inserted + text.slice(end);
      const urlStart = start + label.length + 3;
      return { value, selectionStart: urlStart, selectionEnd: urlStart + 3 };
    }
    case 'heading':
      return prefixLines(text, start, end, '## ');
    case 'bulletList':
      return prefixLines(text, start, end, '- ');
    case 'numberedList':
      return prefixLines(text, start, end, (line, i) => `${i + 1}. ${line}`);
    case 'quote':
      return prefixLines(text, start, end, '> ');
    case 'hr': {
      const block = '\n\n---\n\n';
      const value = text.slice(0, start) + block + text.slice(end);
      const pos = start + block.length;
      return { value, selectionStart: pos, selectionEnd: pos };
    }
    default:
      return { value: text, selectionStart: start, selectionEnd: end };
  }
}

function wrap(
  text: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string,
): MarkdownEditResult {
  const selected = text.slice(start, end);
  const inner = selected || placeholder;
  const value = text.slice(0, start) + before + inner + after + text.slice(end);
  const selStart = start + before.length;
  const selEnd = selStart + inner.length;
  return {
    value,
    selectionStart: selected ? selStart : selStart,
    selectionEnd: selected ? selEnd : selEnd,
  };
}

function prefixLines(
  text: string,
  start: number,
  end: number,
  prefix: string | ((line: string, index: number) => string),
): MarkdownEditResult {
  const { lineStart, lineEnd } = lineBounds(text, start, end);
  const block = text.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const prefixed = lines.map((line, i) => {
    const p = typeof prefix === 'function' ? prefix(line, i) : prefix + line;
    return line.length === 0 ? line : p;
  });
  const replacement = prefixed.join('\n');
  const value = text.slice(0, lineStart) + replacement + text.slice(lineEnd);
  const delta = replacement.length - block.length;
  return {
    value,
    selectionStart: start,
    selectionEnd: end + delta,
  };
}

function lineBounds(text: string, start: number, end: number) {
  const lineStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const nextNl = text.indexOf('\n', end);
  const lineEnd = nextNl === -1 ? text.length : nextNl;
  return { lineStart, lineEnd };
}
