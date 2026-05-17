import { TreeNode } from '../models';

/** URL-safe segment from a human title (supports unicode letters). */
export function slugifySegment(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/\//g, '-')
    .replace(/[^\p{L}\p{N}\s/_-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\/+|\/+$/g, '');
  return (s.slice(0, 96) || 'untitled').replace(/^-+|-+$/g, '');
}

/** Unique page/folder id under a sidebar parent (workspace roots use flat ids). */
export function uniqueChildId(parentId: string, title: string, existingIds: Set<string>): string {
  const slug = slugifySegment(title);
  const base =
    parentId === 'workspace-acme' || parentId === 'private' ? slug : `${parentId}/${slug}`;
  let id = base;
  let n = 2;
  while (existingIds.has(id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

export function collectTreeIds(nodes: TreeNode[] | undefined, out: Set<string> = new Set()): Set<string> {
  if (!nodes?.length) return out;
  for (const n of nodes) {
    out.add(n.id);
    collectTreeIds(n.children, out);
  }
  return out;
}

const DEFAULT_WORKSPACE_ID = 'workspace-acme';

/** Ensure nodes backed by real pages are treated as openable pages in the sidebar. */
export function normalizeNavigationTree(
  nodes: TreeNode[] | undefined,
  pageIds: ReadonlySet<string>,
): TreeNode[] {
  if (!nodes?.length) return [];
  return nodes.map((n) => normalizeTreeNode(n, pageIds));
}

function normalizeTreeNode(n: TreeNode, pageIds: ReadonlySet<string>): TreeNode {
  const children = n.children?.length
    ? n.children.map((c) => normalizeTreeNode(c, pageIds))
    : undefined;
  let kind = n.kind;
  if (n.kind !== 'workspace' && pageIds.has(n.id)) {
    kind = 'page';
  }
  const title = n.id === DEFAULT_WORKSPACE_ID && n.title.toUpperCase() === 'ACME' ? 'Acme' : n.title;
  return { ...n, kind, title, children };
}

/**
 * Fix trees where hub pages (e.g. Engineering) were saved as a second root `folder`.
 * Those render as a section header that only expands — not as a clickable page row.
 */
export function repairNavigationTree(
  nodes: TreeNode[] | undefined,
  pageIds: ReadonlySet<string>,
): TreeNode[] {
  if (!nodes?.length) return [];

  const normalized = normalizeNavigationTree(nodes, pageIds);
  const workspaces = normalized.filter((n) => n.kind === 'workspace');
  const orphans = normalized.filter((n) => n.kind !== 'workspace');

  if (orphans.length === 0) {
    return workspaces.length > 0 ? workspaces : normalized;
  }

  let acme = workspaces.find((w) => w.id === DEFAULT_WORKSPACE_ID) ?? workspaces[0];
  if (!acme) {
    return [
      {
        id: DEFAULT_WORKSPACE_ID,
        title: 'Acme',
        kind: 'workspace',
        children: orphans,
      },
    ];
  }

  return workspaces.map((w) =>
    w.id === acme!.id ? { ...w, children: [...(w.children ?? []), ...orphans] } : w,
  );
}

/** Normalize kinds and repair orphan roots (call when loading or saving the tree). */
export function prepareNavigationTree(
  nodes: TreeNode[] | undefined,
  pageIds: ReadonlySet<string>,
): TreeNode[] {
  return repairNavigationTree(nodes, pageIds);
}

export function findTreeNode(nodes: TreeNode[] | undefined, targetId: string): TreeNode | null {
  if (!nodes?.length) return null;
  for (const n of nodes) {
    if (n.id === targetId) return n;
    const sub = findTreeNode(n.children, targetId);
    if (sub) return sub;
  }
  return null;
}

export function findNodePath(nodes: TreeNode[], targetId: string): TreeNode[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return [n];
    if (n.children?.length) {
      const sub = findNodePath(n.children, targetId);
      if (sub) return [n, ...sub];
    }
  }
  return null;
}

/** Breadcrumb trail for a new page (workspace nodes are not part of the path). */
export function breadcrumbForNewPage(parentPath: TreeNode[], pageTitle: string): string[] {
  return [...parentPath.filter((n) => n.kind !== 'workspace').map((n) => n.title), pageTitle];
}

/** Strip legacy workspace label from API/demo breadcrumbs (Acme is the workspace, not a page parent). */
export function stripWorkspaceBreadcrumbPrefix(
  breadcrumb: string[],
  workspaceTitles: readonly string[] = ['Acme'],
): string[] {
  if (breadcrumb.length > 0 && workspaceTitles.includes(breadcrumb[0])) {
    return breadcrumb.slice(1);
  }
  return breadcrumb;
}

export function insertTreeChild(nodes: TreeNode[], parentId: string, child: TreeNode): TreeNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...(n.children ?? []), child] };
    }
    if (n.children?.length) {
      return { ...n, children: insertTreeChild(n.children, parentId, child) };
    }
    return n;
  });
}

/** Update display title for a tree node by id (matches exactly one node). */
export function renameTreeNodeTitle(nodes: TreeNode[], id: string, title: string): TreeNode[] {
  return nodes.map((n) => {
    if (n.id === id) {
      return { ...n, title };
    }
    if (n.children?.length) {
      return { ...n, children: renameTreeNodeTitle(n.children, id, title) };
    }
    return n;
  });
}

/** Set or clear `icon` on a tree node (`undefined` removes the property). */
export function updateTreeNodeIcon(
  nodes: TreeNode[],
  id: string,
  icon: string | undefined,
): TreeNode[] {
  return nodes.map((n) => {
    if (n.id === id) {
      if (!icon) {
        const { icon: _removed, ...rest } = n;
        return rest as TreeNode;
      }
      return { ...n, icon };
    }
    if (n.children?.length) {
      return { ...n, children: updateTreeNodeIcon(n.children, id, icon) };
    }
    return n;
  });
}

export function removeTreeNode(
  nodes: TreeNode[],
  id: string,
): { tree: TreeNode[]; removed: TreeNode | null } {
  let removed: TreeNode | null = null;
  const walk = (list: TreeNode[]): TreeNode[] =>
    list
      .map((n) => {
        if (n.id === id) {
          removed = n;
          return null;
        }
        if (n.children?.length) {
          const children = walk(n.children).filter(Boolean) as TreeNode[];
          return { ...n, children };
        }
        return n;
      })
      .filter(Boolean) as TreeNode[];
  return { tree: walk(nodes), removed };
}

/** Move `dragId` onto `targetId` (as child if folder/workspace, else after as sibling). */
export function moveTreeNode(nodes: TreeNode[], dragId: string, targetId: string): TreeNode[] {
  const { tree: without, removed } = removeTreeNode(nodes, dragId);
  if (!removed) return nodes;

  const target = findTreeNode(without, targetId);
  if (!target) return nodes;

  if (target.kind === 'folder' || target.kind === 'workspace') {
    return insertTreeChild(without, targetId, removed);
  }

  const insertAfter = (list: TreeNode[]): TreeNode[] => {
    const out: TreeNode[] = [];
    for (const n of list) {
      out.push(n);
      if (n.id === targetId) {
        out.push(removed);
      } else if (n.children?.length) {
        const kids = insertAfter(n.children);
        if (kids !== n.children) {
          out[out.length - 1] = { ...n, children: kids };
        }
      }
    }
    return out;
  };

  return insertAfter(without);
}

export function removeTreeNodeById(nodes: TreeNode[], id: string): TreeNode[] {
  return removeTreeNode(nodes, id).tree;
}
