// Header — breadcrumbs, search, viewer avatars, share, actions, theme toggle
const { useState: useStateH, useRef: useRefH, useEffect: useEffectH } = React;

function Avatar({ initial, color, size = 22, title, ring }) {
  return (
    <span className="avatar" title={title} style={{
      width: size, height: size, background: color,
      fontSize: size * 0.45, boxShadow: ring ? "0 0 0 2px var(--bg)" : "none"
    }}>{initial}</span>
  );
}

function AvatarStack({ ids, max = 4 }) {
  const shown = ids.slice(0, max);
  const extra = ids.length - shown.length;
  return (
    <div className="avatar-stack">
      {shown.map((id, i) => {
        const p = window.PEOPLE[id] || { name: id, color: "#888" };
        return <Avatar key={id + i} initial={id[0]} color={p.color} size={22} title={p.name} ring />;
      })}
      {extra > 0 && <span className="avatar avatar-more" style={{ width: 22, height: 22 }}>+{extra}</span>}
    </div>
  );
}

function ThemeToggle({ theme, onChange }) {
  return (
    <button className="hd-icon-btn" onClick={() => onChange(theme === "dark" ? "light" : "dark")} title="Toggle theme">
      {theme === "dark" ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 8.5A4.5 4.5 0 015.5 3a.5.5 0 00-.7-.5 5.5 5.5 0 105.7 6.7.5.5 0 00-.5-.7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.5 2.5l1 1M10.5 10.5l1 1M11.5 2.5l-1 1M3.5 10.5l-1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
      )}
    </button>
  );
}

function Header({ page, onSelect, theme, onThemeChange, onOpenSearch, onShare, onOpenActions, viewers, onOpenInbox, unreadCount }) {
  return (
    <header className="hd">
      <div className="hd-left">
        <button className="hd-icon-btn hd-back" title="Back">
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 3l-4 4 4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button className="hd-icon-btn hd-back" title="Forward">
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <nav className="hd-crumbs">
          {page.breadcrumb.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="hd-crumb-sep">/</span>}
              <span className={"hd-crumb" + (i === page.breadcrumb.length - 1 ? " is-current" : "")}>{c}</span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="hd-center">
        <button className="hd-search" onClick={onOpenSearch}>
          <svg width="13" height="13" viewBox="0 0 13 13"><circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <span>Search Acme…</span>
          <kbd className="kbd">⌘K</kbd>
        </button>
      </div>

      <div className="hd-right">
        <div className="hd-viewers">
          <span className="hd-viewer-dot" /> <span className="hd-viewer-count">{viewers.length} viewing</span>
          <AvatarStack ids={viewers} max={3} />
        </div>
        <button className="hd-share" onClick={onShare}>
          <svg width="13" height="13" viewBox="0 0 13 13"><circle cx="3" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/><circle cx="10" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/><circle cx="10" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M4.5 5.7l4-2M4.5 7.3l4 2" stroke="currentColor" strokeWidth="1.2"/></svg>
          <span>Share</span>
        </button>
        <ThemeToggle theme={theme} onChange={onThemeChange} />
        <button className="hd-icon-btn hd-bell" onClick={onOpenInbox} title="Inbox">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 5.5a3.5 3.5 0 117 0v2L11.5 9h-9l1-1.5v-2zM5.5 11a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {unreadCount > 0 && <span className="hd-bell-dot" />}
        </button>
        <button className="hd-icon-btn" onClick={onOpenActions} title="Page actions">
          <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="3" cy="7" r="1.1" fill="currentColor"/><circle cx="7" cy="7" r="1.1" fill="currentColor"/><circle cx="11" cy="7" r="1.1" fill="currentColor"/></svg>
        </button>
        <Avatar initial="M" color="#ec4899" size={26} title="Maya Chen (you)" />
      </div>
    </header>
  );
}

window.Header = Header;
window.Avatar = Avatar;
window.AvatarStack = AvatarStack;
