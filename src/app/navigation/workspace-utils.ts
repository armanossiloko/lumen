/** Map API workspace id to navigation tree workspace root node id. */
export function treeWorkspaceId(apiId: string): string {
  if (apiId === 'acme') return 'workspace-acme';
  if (apiId === 'personal') return 'private';
  return `workspace-${apiId}`;
}

/** Map tree workspace root node id to API workspace id. */
export function apiWorkspaceId(treeId: string): string {
  if (treeId === 'workspace-acme') return 'acme';
  if (treeId === 'private') return 'personal';
  if (treeId.startsWith('workspace-')) return treeId.slice('workspace-'.length);
  return treeId;
}
