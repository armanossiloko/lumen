// Core data models for Lumen

export interface TextPart {
  t: string;
  b?: boolean;
  i?: boolean;
  c?: boolean;
  l?: string;
}

export interface TodoItem {
  done: boolean;
  text: string;
  commentCount?: number;
}

export interface Block {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'todo' | 'callout' | 'code' | 'quote' | 'divider' | 'table' | 'image' | 'video';
  text?: string | TextPart[];
  items?: (string | TodoItem)[];
  tone?: 'info' | 'warn' | 'danger';
  lang?: string;
  code?: string;
  headers?: string[];
  rows?: string[][];
  caption?: string;
  placeholder?: string;
}

export interface Page {
  id: string;
  /** Emoji, data URL image, or empty for no icon. */
  icon?: string;
  title: string;
  breadcrumb: string[];
  updatedBy: string;
  updatedAt: string;
  contributors: string[];
  version?: number;
  blocks: Block[];
  /** When set (non-empty), page body renders from Markdown (GFM) instead of blocks. */
  markdownBody?: string;
}

export interface TreeNode {
  id: string;
  title: string;
  icon?: string;
  kind: 'workspace' | 'page' | 'folder';
  children?: TreeNode[];
}

export interface Person {
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  at: string;
  resolved: boolean;
  replies?: Comment[];
  /** Emoji → user ids (same convention as page reactions). */
  reactions?: Record<string, string[]>;
  pageId?: string;
  blockIdx?: number | null;
  parentCommentId?: string | null;
}

export interface Reaction {
  pageId: string;
  emoji: string;
  userId: string;
}

export interface InboxItem {
  id: string;
  author: string;
  verb: string;
  pageId: string;
  pageTitle: string;
  snippet: string;
  at: string;
  unread: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  initial: string;
  color: string;
  members: number;
}

export interface TweakDefaults {
  theme: 'dark' | 'light';
  accent: string;
}
