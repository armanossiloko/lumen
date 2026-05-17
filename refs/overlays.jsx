// Comments panel, page footer (reactions + thread), command palette, share modal
const { useState: useStateC, useRef: useRefC, useEffect: useEffectC, useMemo: useMemoC } = React;

function timeAgo(s) { return s; }

function CommentsPanel({ open, threads, page, blockMap, onClose, onResolve, onReply, onJump, currentUser }) {
  const [filter, setFilter] = useStateC("open"); // open | resolved | all
  const list = useMemoC(() => {
    return Object.entries(threads).map(([key, comments]) => ({
      key, comments, blockIdx: parseInt(key.split("__")[1], 10),
      blockSnippet: blockMap[parseInt(key.split("__")[1], 10)] || "",
      resolved: comments.every((c) => c.resolved)
    })).filter((t) => filter === "all" ? true : filter === "resolved" ? t.resolved : !t.resolved);
  }, [threads, blockMap, filter]);

  if (!open) return null;
  return (
    <aside className="cmt-panel">
      <div className="cmt-hd">
        <div className="cmt-hd-title">Comments</div>
        <button className="hd-icon-btn" onClick={onClose} title="Close">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
      </div>
      <div className="cmt-tabs">
        {["open", "resolved", "all"].map((f) => (
          <button key={f} className={"cmt-tab" + (filter === f ? " is-active" : "")} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="cmt-list">
        {list.length === 0 && <div className="cmt-empty">No {filter} comments yet.</div>}
        {list.map((t) => (
          <div key={t.key} className="cmt-thread" onClick={() => onJump(t.blockIdx)}>
            <div className="cmt-thread-anchor">{t.blockSnippet || "Block " + (t.blockIdx + 1)}</div>
            {t.comments.map((c, i) => {
              const p = window.PEOPLE[c.author] || {};
              return (
                <div key={c.id} className="cmt-item">
                  <Avatar initial={c.author[0]} color={p.color} size={20} />
                  <div className="cmt-body">
                    <div className="cmt-meta"><strong>{p.name}</strong> <span className="cmt-time">{c.at}</span></div>
                    <div className="cmt-text">{c.text}</div>
                  </div>
                </div>
              );
            })}
            <div className="cmt-actions">
              <button className="cmt-act" onClick={(e) => { e.stopPropagation(); onResolve(t.key); }}>
                {t.resolved ? "Reopen" : "✓ Resolve"}
              </button>
              <button className="cmt-act" onClick={(e) => { e.stopPropagation(); onJump(t.blockIdx); }}>View in page</button>
            </div>
            <CommentReplyBox onSubmit={(text) => onReply(t.key, text)} currentUser={currentUser} />
          </div>
        ))}
      </div>
    </aside>
  );
}

function CommentReplyBox({ onSubmit, currentUser, placeholder = "Reply…" }) {
  const [v, setV] = useStateC("");
  const [active, setActive] = useStateC(false);
  return (
    <div className={"cmt-reply" + (active ? " is-active" : "")}>
      <Avatar initial="M" color="#ec4899" size={20} />
      <input
        className="cmt-input"
        placeholder={placeholder}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onFocus={() => setActive(true)}
        onBlur={() => { if (!v) setActive(false); }}
        onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onSubmit(v.trim()); setV(""); } }}
      />
      {(active || v) && (
        <button className="cmt-send" disabled={!v.trim()} onClick={() => { if (v.trim()) { onSubmit(v.trim()); setV(""); } }}>
          Send
        </button>
      )}
    </div>
  );
}

const REACTION_PALETTE = ["👍", "❤️", "🎉", "🚀", "👀", "🌱", "🔥", "💯", "✅", "👋"];

function PageFooter({ pageId, reactions, onReact, pageThread, onAddPageComment, onReplyPageComment }) {
  const [openPicker, setOpenPicker] = useStateC(false);
  const ref = useRefC(null);
  useEffectC(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpenPicker(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="page-foot">
      <div className="reactions">
        {Object.entries(reactions || {}).map(([emoji, users]) => {
          const youReacted = users.includes("YOU");
          return (
            <button key={emoji} className={"reaction" + (youReacted ? " is-mine" : "")} onClick={() => onReact(emoji)}>
              <span className="reaction-emoji">{emoji}</span>
              <span className="reaction-count">{users.length}</span>
            </button>
          );
        })}
        <div className="reaction-add-wrap" ref={ref}>
          <button className="reaction reaction-add" onClick={() => setOpenPicker(!openPicker)}>
            <svg width="13" height="13" viewBox="0 0 13 13"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2" fill="none"/><circle cx="5" cy="5.5" r=".7" fill="currentColor"/><circle cx="8" cy="5.5" r=".7" fill="currentColor"/><path d="M4.5 8c.5.7 1.3 1.2 2 1.2S8 8.7 8.5 8" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round"/></svg>
            <span>+</span>
          </button>
          {openPicker && (
            <div className="reaction-picker">
              {REACTION_PALETTE.map((e) => (
                <button key={e} className="reaction-pick" onClick={() => { onReact(e); setOpenPicker(false); }}>{e}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="page-thread">
        <div className="page-thread-hd">
          <span>Discussion</span>
          <span className="page-thread-count">{pageThread.length} {pageThread.length === 1 ? "comment" : "comments"}</span>
        </div>
        {pageThread.map((c) => {
          const p = window.PEOPLE[c.author] || {};
          return (
            <div key={c.id} className="page-cmt">
              <Avatar initial={c.author[0]} color={p.color} size={28} />
              <div className="page-cmt-body">
                <div className="page-cmt-meta"><strong>{p.name}</strong> <span className="cmt-time">{c.at}</span></div>
                <div className="page-cmt-text">{c.text}</div>
                {c.replies && c.replies.length > 0 && (
                  <div className="page-cmt-replies">
                    {c.replies.map((r) => {
                      const rp = window.PEOPLE[r.author] || {};
                      return (
                        <div key={r.id} className="page-cmt page-cmt--reply">
                          <Avatar initial={r.author[0]} color={rp.color} size={22} />
                          <div className="page-cmt-body">
                            <div className="page-cmt-meta"><strong>{rp.name}</strong> <span className="cmt-time">{r.at}</span></div>
                            <div className="page-cmt-text">{r.text}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <CommentReplyBox onSubmit={(text) => onReplyPageComment(c.id, text)} placeholder="Reply…" />
              </div>
            </div>
          );
        })}
        <div className="page-cmt page-cmt--new">
          <Avatar initial="M" color="#ec4899" size={28} />
          <CommentReplyBox onSubmit={onAddPageComment} placeholder="Add a comment…" />
        </div>
      </div>
    </div>
  );
}

function CommandPalette({ open, onClose, pages, onSelect, onCreatePage }) {
  const [q, setQ] = useStateC("");
  const [idx, setIdx] = useStateC(0);
  useEffectC(() => { if (open) { setQ(""); setIdx(0); } }, [open]);

  const items = useMemoC(() => {
    const all = Object.values(pages).map((p) => ({
      kind: "page", id: p.id, title: p.title, sub: p.breadcrumb.slice(0, -1).join(" / "),
      icon: p.icon, hint: "Jump to"
    }));
    const filtered = q ? all.filter((it) => (it.title + " " + it.sub).toLowerCase().includes(q.toLowerCase())) : all;
    const actions = q ? [{ kind: "action", id: "create", title: 'Create new page "' + q + '"', icon: "+", hint: "New" }] : [
      { kind: "action", id: "today", title: "Open today's notes", icon: "📅", hint: "Action" },
      { kind: "action", id: "templates", title: "Browse templates", icon: "▦", hint: "Action" }
    ];
    return [...actions, ...filtered.slice(0, 8)];
  }, [q, pages]);

  useEffectC(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
      if (e.key === "Enter") {
        e.preventDefault();
        const it = items[idx];
        if (!it) return;
        if (it.kind === "page") onSelect(it.id);
        else if (it.id === "create") onCreatePage(q);
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, idx]);

  if (!open) return null;
  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <input autoFocus className="cmd-input" placeholder="Search pages or run a command…" value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} />
          <kbd className="kbd kbd-esc">esc</kbd>
        </div>
        <div className="cmd-list">
          {items.map((it, i) => (
            <button key={it.kind + it.id} className={"cmd-item" + (i === idx ? " is-active" : "")} onMouseEnter={() => setIdx(i)} onClick={() => {
              if (it.kind === "page") onSelect(it.id);
              else if (it.id === "create") onCreatePage(q);
              onClose();
            }}>
              <span className="cmd-item-icon">{it.icon}</span>
              <span className="cmd-item-title">{it.title}</span>
              {it.sub && <span className="cmd-item-sub">{it.sub}</span>}
              <span className="cmd-item-hint">{it.hint}</span>
            </button>
          ))}
          {items.length === 0 && <div className="cmd-empty">No matches.</div>}
        </div>
        <div className="cmd-foot">
          <span><kbd className="kbd">↑↓</kbd> Navigate</span>
          <span><kbd className="kbd">↵</kbd> Open</span>
          <span><kbd className="kbd">esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}

function ShareModal({ open, onClose, page }) {
  if (!open) return null;
  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="share" onClick={(e) => e.stopPropagation()}>
        <div className="share-hd">
          <div className="share-title">Share "{page.title}"</div>
          <button className="hd-icon-btn" onClick={onClose}><svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4"/></svg></button>
        </div>
        <div className="share-input">
          <input placeholder="Add people or teams by email…" />
          <select className="share-role"><option>Can edit</option><option>Can comment</option><option>Can view</option></select>
          <button className="btn btn-primary">Invite</button>
        </div>
        <div className="share-section">People with access</div>
        <div className="share-people">
          {page.contributors.map((id) => {
            const p = window.PEOPLE[id] || {};
            return (
              <div key={id} className="share-person">
                <Avatar initial={id[0]} color={p.color} size={28} />
                <div className="share-person-meta"><div className="share-person-name">{p.name}</div><div className="share-person-email">{p.name.toLowerCase().replace(" ", ".")}@acme.com</div></div>
                <span className="share-role-tag">Can edit</span>
              </div>
            );
          })}
        </div>
        <div className="share-section">General access</div>
        <div className="share-general">
          <div className="share-general-icon">🏢</div>
          <div className="share-general-meta">
            <div className="share-general-title">Anyone at Acme</div>
            <div className="share-general-sub">Can view this page</div>
          </div>
          <select className="share-role"><option>Can view</option><option>Can comment</option><option>Restricted</option></select>
        </div>
        <div className="share-foot">
          <button className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText("https://lumen.acme.com/" + page.id)}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M5 7l2-2M4 8l-1.5 1.5a1.5 1.5 0 002 2L6 10M8 4l1.5-1.5a1.5 1.5 0 00-2-2L6 2" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/></svg>
            Copy link
          </button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function PageActionsMenu({ open, onClose, anchorRef, onAction }) {
  if (!open) return null;
  return (
    <div className="actions-overlay" onClick={onClose}>
      <div className="actions-menu" onClick={(e) => e.stopPropagation()}>
        <div className="actions-section">Page</div>
        <button className="actions-item" onClick={() => onAction("favorite")}><span>⭐</span> Add to favorites</button>
        <button className="actions-item" onClick={() => onAction("duplicate")}><span>⎘</span> Duplicate</button>
        <button className="actions-item" onClick={() => onAction("move")}><span>↗</span> Move to…</button>
        <button className="actions-item" onClick={() => onAction("export")}><span>↓</span> Export as PDF</button>
        <div className="actions-divider"></div>
        <div className="actions-section">View</div>
        <button className="actions-item" onClick={() => onAction("history")}><span>⟲</span> Page history</button>
        <button className="actions-item" onClick={() => onAction("backlinks")}><span>↺</span> Backlinks</button>
        <div className="actions-divider"></div>
        <button className="actions-item actions-item--danger" onClick={() => onAction("delete")}><span>🗑</span> Move to trash</button>
      </div>
    </div>
  );
}

function InboxPanel({ open, onClose, items, onMarkRead, onJump }) {
  if (!open) return null;
  return (
    <div className="inbox-overlay" onClick={onClose}>
      <div className="inbox" onClick={(e) => e.stopPropagation()}>
        <div className="inbox-hd">
          <div className="inbox-title">Inbox</div>
          <button className="btn btn-ghost btn-sm" onClick={() => items.forEach((i) => onMarkRead(i.id))}>Mark all read</button>
        </div>
        <div className="inbox-list">
          {items.map((it) => {
            const p = window.PEOPLE[it.author] || {};
            return (
              <button key={it.id} className={"inbox-item" + (it.unread ? " is-unread" : "")} onClick={() => { onJump(it.pageId); onMarkRead(it.id); onClose(); }}>
                {it.unread && <span className="inbox-dot" />}
                <Avatar initial={it.author[0]} color={p.color} size={28} />
                <div className="inbox-meta">
                  <div className="inbox-line"><strong>{p.name}</strong> {it.verb} <em>{it.pageTitle}</em></div>
                  <div className="inbox-snippet">{it.snippet}</div>
                  <div className="inbox-time">{it.at}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.CommentsPanel = CommentsPanel;
window.PageFooter = PageFooter;
window.CommandPalette = CommandPalette;
window.ShareModal = ShareModal;
window.PageActionsMenu = PageActionsMenu;
window.InboxPanel = InboxPanel;
