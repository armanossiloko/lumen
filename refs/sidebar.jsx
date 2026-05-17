// Sidebar — workspace tree with expand/collapse, drag reorder, add page
const { useState, useRef, useEffect, useCallback, useMemo } = React;

function Chevron({ open }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .12s" }}>
      <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}
function DotsIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="2.5" cy="6" r="1" fill="currentColor"/><circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="9.5" cy="6" r="1" fill="currentColor"/></svg>;
}

function TreeNode({ node, depth, currentId, onSelect, expanded, toggleExpand, onAddChild, onDragStart, onDragOver, onDrop, dragOverId, addingUnder, onCommitAdd, onCancelAdd }) {
  const isOpen = expanded[node.id];
  const isCurrent = node.id === currentId;
  const hasChildren = node.children && node.children.length > 0;
  const [hover, setHover] = useState(false);
  const isDragOver = dragOverId === node.id;

  return (
    <div>
      <div
        className={"tree-row" + (isCurrent ? " is-current" : "") + (isDragOver ? " is-drag-over" : "")}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable={node.kind !== "workspace"}
        onDragStart={(e) => { e.stopPropagation(); onDragStart(node.id); }}
        onDragOver={(e) => { e.preventDefault(); onDragOver(node.id); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(node.id); }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => {
          if (node.kind === "page") onSelect(node.id);
          else if (hasChildren) toggleExpand(node.id);
        }}
      >
        <span className="tree-chev" onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleExpand(node.id); }}>
          {hasChildren ? <Chevron open={isOpen} /> : <span style={{ width: 10, display: "inline-block" }} />}
        </span>
        {node.icon && <span className="tree-icon">{node.icon}</span>}
        <span className="tree-label">{node.title}</span>
        {hover && node.kind !== "workspace" && (
          <span className="tree-actions" onClick={(e) => e.stopPropagation()}>
            <button className="tree-act" title="More" onClick={(e) => e.stopPropagation()}><DotsIcon /></button>
            <button className="tree-act" title="Add page" onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}><PlusIcon /></button>
          </span>
        )}
      </div>
      {isOpen && hasChildren && (
        <div>
          {node.children.map((c) => (
            <TreeNode
              key={c.id}
              node={c}
              depth={depth + 1}
              currentId={currentId}
              onSelect={onSelect}
              expanded={expanded}
              toggleExpand={toggleExpand}
              onAddChild={onAddChild}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              dragOverId={dragOverId}
              addingUnder={addingUnder}
              onCommitAdd={onCommitAdd}
              onCancelAdd={onCancelAdd}
            />
          ))}
          {addingUnder === node.id && (
            <div className="tree-row tree-add" style={{ paddingLeft: 8 + (depth + 1) * 14 }}>
              <span className="tree-chev"><span style={{ width: 10, display: "inline-block" }} /></span>
              <span className="tree-icon">📄</span>
              <input
                autoFocus
                className="tree-add-input"
                placeholder="Untitled"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCommitAdd(node.id, e.target.value || "Untitled");
                  if (e.key === "Escape") onCancelAdd();
                }}
                onBlur={(e) => { if (e.target.value) onCommitAdd(node.id, e.target.value); else onCancelAdd(); }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorkspaceSwitcher({ workspaces, current, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="ws-switcher" ref={ref}>
      <button className="ws-btn" onClick={() => setOpen(!open)}>
        <span className="ws-avatar" style={{ background: current.color }}>{current.initial}</span>
        <span className="ws-name">{current.name}</span>
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="ws-dropdown">
          <div className="ws-dd-section">Workspaces</div>
          {workspaces.map((w) => (
            <button key={w.id} className={"ws-dd-item" + (w.id === current.id ? " is-current" : "")} onClick={() => { onChange(w.id); setOpen(false); }}>
              <span className="ws-avatar" style={{ background: w.color }}>{w.initial}</span>
              <div className="ws-dd-meta">
                <div className="ws-dd-name">{w.name}</div>
                <div className="ws-dd-sub">{w.members} members</div>
              </div>
              {w.id === current.id && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.5L5 9l4.5-5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
          ))}
          <div className="ws-dd-divider"></div>
          <button className="ws-dd-item ws-dd-item--quiet">
            <span className="ws-avatar" style={{ background: "transparent", border: "1px dashed var(--border)" }}>+</span>
            <div className="ws-dd-meta"><div className="ws-dd-name">Create workspace</div></div>
          </button>
        </div>
      )}
    </div>
  );
}

function Sidebar({ tree, currentId, onSelect, onTreeChange, onOpenSearch, onOpenInbox, unreadCount }) {
  const [expanded, setExpanded] = useState({
    "workspace-acme": true, "private": true,
    "engineering": true, "product": true, "handbook": true,
    "drafts": true, "engineering/rfcs": true, "engineering/runbooks": false
  });
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [addingUnder, setAddingUnder] = useState(null);

  const toggleExpand = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const handleDrop = (targetId) => {
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return; }
    onTreeChange(moveNode(tree, draggingId, targetId));
    setDraggingId(null); setDragOverId(null);
  };

  const handleAdd = (parentId) => {
    setExpanded((e) => ({ ...e, [parentId]: true }));
    setAddingUnder(parentId);
  };
  const commitAdd = (parentId, title) => {
    const newId = "new/" + Date.now();
    onTreeChange(addChild(tree, parentId, { id: newId, title, icon: "📄", kind: "page" }));
    setAddingUnder(null);
    onSelect(newId, { title, isNew: true });
  };

  return (
    <aside className="sidebar">
      <WorkspaceSwitcher
        current={{ id: "acme", name: "Acme", initial: "A", color: "var(--accent)" }}
        workspaces={[
          { id: "acme", name: "Acme", initial: "A", color: "var(--accent)", members: 87 },
          { id: "lab", name: "Acme Labs", initial: "L", color: "#6366f1", members: 12 },
          { id: "personal", name: "Personal", initial: "M", color: "#10b981", members: 1 }
        ]}
        onChange={() => {}}
      />

      <div className="sb-quick">
        <button className="sb-quick-btn" onClick={onOpenSearch}>
          <svg width="13" height="13" viewBox="0 0 13 13"><circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <span>Search</span>
          <kbd className="kbd">⌘K</kbd>
        </button>
        <button className="sb-quick-btn" onClick={onOpenInbox}>
          <svg width="13" height="13" viewBox="0 0 13 13"><path d="M2 5.5L6.5 2 11 5.5v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/></svg>
          <span>Inbox</span>
          {unreadCount > 0 && <span className="sb-badge">{unreadCount}</span>}
        </button>
      </div>

      <div className="sb-tree">
        {tree.map((root) => (
          <div key={root.id} className="sb-section">
            <div className="sb-section-hd" onClick={() => toggleExpand(root.id)}>
              <Chevron open={expanded[root.id]} />
              <span>{root.title}</span>
              <span className="sb-section-actions">
                <button className="tree-act" onClick={(e) => { e.stopPropagation(); handleAdd(root.id); }} title="Add page"><PlusIcon /></button>
              </span>
            </div>
            {expanded[root.id] && (root.children || []).map((c) => (
              <TreeNode
                key={c.id}
                node={c}
                depth={0}
                currentId={currentId}
                onSelect={onSelect}
                expanded={expanded}
                toggleExpand={toggleExpand}
                onAddChild={handleAdd}
                onDragStart={setDraggingId}
                onDragOver={setDragOverId}
                onDrop={handleDrop}
                dragOverId={dragOverId}
                addingUnder={addingUnder}
                onCommitAdd={commitAdd}
                onCancelAdd={() => setAddingUnder(null)}
              />
            ))}
            {addingUnder === root.id && (
              <div className="tree-row tree-add" style={{ paddingLeft: 8 }}>
                <span className="tree-chev"><span style={{ width: 10, display: "inline-block" }} /></span>
                <span className="tree-icon">📄</span>
                <input
                  autoFocus className="tree-add-input" placeholder="Untitled"
                  onKeyDown={(e) => { if (e.key === "Enter") commitAdd(root.id, e.target.value || "Untitled"); if (e.key === "Escape") setAddingUnder(null); }}
                  onBlur={(e) => { if (e.target.value) commitAdd(root.id, e.target.value); else setAddingUnder(null); }}
                />
              </div>
            )}
          </div>
        ))}

        <button className="sb-add-page" onClick={() => handleAdd(tree[0].id)}>
          <PlusIcon /><span>New page</span>
        </button>
      </div>

      <div className="sb-foot">
        <div className="sb-trash">
          <svg width="13" height="13" viewBox="0 0 13 13"><path d="M3 4h7l-.5 7a1 1 0 01-1 1H4.5a1 1 0 01-1-1L3 4zM5 4V2.5a1 1 0 011-1h1a1 1 0 011 1V4M2 4h9" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>Trash</span>
        </div>
        <div className="sb-storage">
          <div className="sb-storage-bar"><div className="sb-storage-fill" style={{ width: "34%" }}></div></div>
          <div className="sb-storage-text">3.4 GB of 10 GB used</div>
        </div>
      </div>
    </aside>
  );
}

// Tree mutation helpers
function findAndRemove(nodes, id) {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      const removed = nodes[i];
      return [removed, [...nodes.slice(0, i), ...nodes.slice(i + 1)]];
    }
    if (nodes[i].children) {
      const [removed, newChildren] = findAndRemove(nodes[i].children, id);
      if (removed) return [removed, [...nodes.slice(0, i), { ...nodes[i], children: newChildren }, ...nodes.slice(i + 1)]];
    }
  }
  return [null, nodes];
}
function insertBefore(nodes, targetId, node) {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === targetId) return [...nodes.slice(0, i), node, ...nodes.slice(i)];
    if (nodes[i].children) {
      const newChildren = insertBefore(nodes[i].children, targetId, node);
      if (newChildren !== nodes[i].children) return [...nodes.slice(0, i), { ...nodes[i], children: newChildren }, ...nodes.slice(i + 1)];
    }
  }
  return nodes;
}
function moveNode(tree, srcId, targetId) {
  if (srcId === targetId) return tree;
  // Don't drop a parent inside its descendant
  if (isDescendant(tree, srcId, targetId)) return tree;
  const [removed, rest] = findAndRemove(tree, srcId);
  if (!removed) return tree;
  return insertBefore(rest, targetId, removed);
}
function isDescendant(nodes, ancestorId, candidateId) {
  for (const n of nodes) {
    if (n.id === ancestorId) return containsId(n.children || [], candidateId);
    if (n.children) {
      const r = isDescendant(n.children, ancestorId, candidateId);
      if (r) return true;
    }
  }
  return false;
}
function containsId(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return true;
    if (n.children && containsId(n.children, id)) return true;
  }
  return false;
}
function addChild(nodes, parentId, child) {
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children: [...(n.children || []), child] };
    if (n.children) return { ...n, children: addChild(n.children, parentId, child) };
    return n;
  });
}

window.Sidebar = Sidebar;
