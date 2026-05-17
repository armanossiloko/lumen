// Block renderer + inline editing
const { useState: useStateB, useRef: useRefB, useEffect: useEffectB } = React;

function renderInline(parts) {
  if (typeof parts === "string") return parts;
  return parts.map((p, i) => {
    if (p.b) return <strong key={i}>{p.t}</strong>;
    if (p.i) return <em key={i}>{p.t}</em>;
    if (p.c) return <code key={i} className="inline-code">{p.t}</code>;
    if (p.l) return <a key={i} href="#" className="page-link" onClick={(e) => { e.preventDefault(); if (p.onClick) p.onClick(); }}>{p.t}</a>;
    return <span key={i}>{p.t}</span>;
  });
}

function inlineToText(parts) {
  if (typeof parts === "string") return parts;
  return parts.map((p) => p.t).join("");
}

function BlockMenu({ onAddAfter, onDelete, onComment, onTurnInto }) {
  return (
    <div className="block-menu">
      <button onClick={onAddAfter} title="Insert below">
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      </button>
      <button onClick={onTurnInto} title="Drag to move">
        <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="4" cy="3" r=".9" fill="currentColor"/><circle cx="8" cy="3" r=".9" fill="currentColor"/><circle cx="4" cy="6" r=".9" fill="currentColor"/><circle cx="8" cy="6" r=".9" fill="currentColor"/><circle cx="4" cy="9" r=".9" fill="currentColor"/><circle cx="8" cy="9" r=".9" fill="currentColor"/></svg>
      </button>
    </div>
  );
}

function CommentPin({ count, onClick }) {
  return (
    <button className="comment-pin" onClick={onClick} title={count + " comment" + (count !== 1 ? "s" : "")}>
      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 3a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 01-1 1H6.5L4 10.5V8H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.2" fill="var(--accent)" fillOpacity=".15" strokeLinejoin="round"/></svg>
      <span>{count}</span>
    </button>
  );
}

function Block({ block, idx, isFocused, onFocus, onChange, onAddAfter, onDelete, onCommentClick, commentCount, onSelectPage }) {
  const ref = useRefB(null);
  const [hover, setHover] = useStateB(false);
  const showHandle = hover || isFocused;
  const showPin = commentCount > 0;

  const editableProps = (field = "text") => ({
    contentEditable: true,
    suppressContentEditableWarning: true,
    onFocus: () => onFocus(idx),
    onBlur: (e) => onChange(idx, { ...block, [field]: e.target.innerText }),
    onKeyDown: (e) => {
      if (e.key === "Enter" && !e.shiftKey && (block.type === "h1" || block.type === "h2" || block.type === "h3")) {
        e.preventDefault();
        e.target.blur();
        onAddAfter(idx);
      }
    }
  });

  const wrap = (children) => (
    <div
      className={"blk" + (isFocused ? " is-focused" : "") + (showPin ? " has-comments" : "")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      ref={ref}
    >
      <div className="blk-gutter">
        {showHandle && <BlockMenu onAddAfter={() => onAddAfter(idx)} onDelete={() => onDelete(idx)} onComment={() => onCommentClick(idx)} onTurnInto={() => {}} />}
      </div>
      <div className="blk-body">{children}</div>
      <div className="blk-pin">
        {showPin && <CommentPin count={commentCount} onClick={() => onCommentClick(idx)} />}
        {!showPin && hover && <button className="blk-comment-add" onClick={() => onCommentClick(idx)} title="Add comment">
          <svg width="13" height="13" viewBox="0 0 13 13"><path d="M2 3a1 1 0 011-1h7a1 1 0 011 1v5a1 1 0 01-1 1H7l-3 3V9H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round"/></svg>
        </button>}
      </div>
    </div>
  );

  switch (block.type) {
    case "h1":
      return wrap(<h1 className="doc-h1" {...editableProps()}>{block.text}</h1>);
    case "h2":
      return wrap(<h2 className="doc-h2" {...editableProps()}>{block.text}</h2>);
    case "h3":
      return wrap(<h3 className="doc-h3" {...editableProps()}>{block.text}</h3>);
    case "p":
      return wrap(<p className="doc-p">{renderInline(block.text)}</p>);
    case "ul":
      return wrap(<ul className="doc-list">{block.items.map((it, i) => <li key={i}>{it}</li>)}</ul>);
    case "ol":
      return wrap(<ol className="doc-list doc-list--ol">{block.items.map((it, i) => <li key={i}>{it}</li>)}</ol>);
    case "todo":
      return wrap(
        <ul className="doc-todo">
          {block.items.map((it, i) => (
            <li key={i} className={it.done ? "is-done" : ""}>
              <button className={"todo-check" + (it.done ? " is-checked" : "")} onClick={() => {
                const items = block.items.map((x, j) => j === i ? { ...x, done: !x.done } : x);
                onChange(idx, { ...block, items });
              }}>
                {it.done && <svg width="9" height="9" viewBox="0 0 9 9"><path d="M1.5 4.8L3.5 6.8L7.5 2.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <span>{it.text}</span>
              {it.commentCount > 0 && <span className="todo-comments">{it.commentCount} 💬</span>}
            </li>
          ))}
        </ul>
      );
    case "callout": {
      const icons = { info: "ℹ", warn: "⚠", danger: "⛔" };
      return wrap(
        <div className={"callout callout--" + block.tone}>
          <div className="callout-icon">{icons[block.tone]}</div>
          <div className="callout-body">{block.text}</div>
        </div>
      );
    }
    case "code":
      return wrap(
        <pre className="code-block">
          <div className="code-hd">
            <span className="code-lang">{block.lang}</span>
            <button className="code-copy" onClick={() => navigator.clipboard?.writeText(block.code)}>Copy</button>
          </div>
          <code><HighlightedCode code={block.code} lang={block.lang} /></code>
        </pre>
      );
    case "quote":
      return wrap(<blockquote className="doc-quote">{block.text}</blockquote>);
    case "divider":
      return wrap(<hr className="doc-divider" />);
    case "table":
      return wrap(
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead><tr>{block.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
            <tbody>{block.rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case "image":
      return wrap(
        <figure className="doc-figure">
          <div className="doc-image-placeholder">
            <span className="doc-image-label">{block.placeholder || "IMAGE"}</span>
          </div>
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    case "video":
      return wrap(
        <figure className="doc-figure">
          <div className="doc-video-placeholder">
            <button className="play-btn" aria-label="Play"><svg width="20" height="20" viewBox="0 0 20 20"><path d="M6 4l10 6-10 6V4z" fill="currentColor"/></svg></button>
            <span className="doc-video-label">VIDEO</span>
            <span className="doc-video-dur">04:12</span>
          </div>
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    default:
      return wrap(<div className="doc-p">{JSON.stringify(block)}</div>);
  }
}

// Lightweight syntax highlighter — very simple
function HighlightedCode({ code, lang }) {
  const tokens = tokenize(code, lang);
  return <>{tokens.map((t, i) => <span key={i} className={t.cls}>{t.text}</span>)}</>;
}

function tokenize(code, lang) {
  const out = [];
  const keywords = {
    typescript: /\b(type|const|let|var|function|return|if|else|for|while|import|export|from|interface|class|extends|new|async|await|true|false|null|undefined|number|string|boolean)\b/,
    bash: /\b(cd|git|pnpm|npm|yarn|export|echo|ls|mkdir|sudo|brew|curl)\b/,
    sql: /\b(SELECT|FROM|WHERE|GROUP|BY|ORDER|JOIN|ON|AS|AND|OR|INSERT|UPDATE|DELETE|INTO|VALUES|CREATE|TABLE|INDEX|COUNT|INTERVAL|NOW)\b/i
  };
  const re = keywords[lang] || /^$/;
  const lines = code.split("\n");
  lines.forEach((line, li) => {
    let i = 0;
    while (i < line.length) {
      const rest = line.slice(i);
      // Comment
      const cm = rest.match(/^(\/\/|#|--).*/);
      if (cm) { out.push({ cls: "tk-comment", text: cm[0] }); i += cm[0].length; continue; }
      // String
      const sm = rest.match(/^(['"`])(?:\\.|[^\\])*?\1/);
      if (sm) { out.push({ cls: "tk-string", text: sm[0] }); i += sm[0].length; continue; }
      // Number
      const nm = rest.match(/^\b\d+(\.\d+)?\b/);
      if (nm) { out.push({ cls: "tk-number", text: nm[0] }); i += nm[0].length; continue; }
      // Keyword
      const km = rest.match(re);
      if (km && km.index === 0) { out.push({ cls: "tk-keyword", text: km[0] }); i += km[0].length; continue; }
      // Identifier
      const im = rest.match(/^[A-Za-z_$][\w$]*/);
      if (im) { out.push({ cls: "tk-id", text: im[0] }); i += im[0].length; continue; }
      out.push({ cls: "tk-plain", text: rest[0] }); i += 1;
    }
    if (li < lines.length - 1) out.push({ cls: "tk-plain", text: "\n" });
  });
  return out;
}

window.Block = Block;
