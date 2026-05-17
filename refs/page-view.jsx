// PageView — renders a page's blocks with inline editing, comment indicators, header
const { useState: useStateP, useRef: useRefP, useEffect: useEffectP, useMemo: useMemoP } = React;

function PageHeader({ page, onTitleChange, pageWidth }) {
  return (
    <div className="page-hd">
      <div className="page-hd-meta">
        <span className="page-hd-icon">{page.icon}</span>
        <span className="page-hd-path">{page.breadcrumb.slice(0, -1).join(" / ")}</span>
        <span className="page-hd-dot">·</span>
        <span className="page-hd-version">v{page.version}</span>
        <span className="page-hd-dot">·</span>
        <span>Updated {page.updatedAt} by {page.updatedBy}</span>
      </div>
      <h1 className="page-hd-title" contentEditable suppressContentEditableWarning
        onBlur={(e) => onTitleChange(e.target.innerText)}>{page.title}</h1>
      <div className="page-hd-foot">
        <AvatarStack ids={page.contributors} max={5} />
        <span className="page-hd-contrib">{page.contributors.length} contributors</span>
      </div>
    </div>
  );
}

function PageView({ page, onTitleChange, blocks, onBlocksChange, comments, onResolveComment, onReplyComment, onAddComment, focusBlockIdx, onFocusBlock, reactions, onReact, pageThread, onAddPageComment, onReplyPageComment, pageWidth, onSelectPage }) {
  const [showSlash, setShowSlash] = useStateP(null); // { idx } when active
  const [insertMenu, setInsertMenu] = useStateP(null); // { idx, x, y }

  const blockMap = useMemoP(() => {
    const m = {};
    blocks.forEach((b, i) => {
      const text = typeof b.text === "string" ? b.text : Array.isArray(b.text) ? b.text.map(p => p.t || "").join("") : "";
      m[i] = text.slice(0, 50);
    });
    return m;
  }, [blocks]);

  const onAddAfter = (idx) => {
    setInsertMenu({ idx });
  };
  const onDeleteBlock = (idx) => {
    onBlocksChange(blocks.filter((_, i) => i !== idx));
  };
  const onChangeBlock = (idx, b) => {
    onBlocksChange(blocks.map((x, i) => i === idx ? b : x));
  };
  const insertBlock = (idx, type) => {
    const newBlock = makeBlankBlock(type);
    onBlocksChange([...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)]);
    setInsertMenu(null);
    setTimeout(() => onFocusBlock(idx + 1), 30);
  };

  const onCommentClick = (idx) => {
    onAddComment(idx);
  };

  return (
    <div className="page-scroll">
      <div className={"page-content page-content--" + pageWidth}>
        <PageHeader page={page} onTitleChange={onTitleChange} />

        <div className="blocks">
          {blocks.map((b, i) => {
            const key = page.id + "__" + i;
            const cnt = (comments[key] || []).filter((c) => !c.resolved).length;
            return (
              <Block
                key={i}
                block={b}
                idx={i}
                isFocused={focusBlockIdx === i}
                onFocus={onFocusBlock}
                onChange={onChangeBlock}
                onAddAfter={onAddAfter}
                onDelete={onDeleteBlock}
                onCommentClick={onCommentClick}
                commentCount={cnt}
                onSelectPage={onSelectPage}
              />
            );
          })}
          <button className="blk-add" onClick={() => onAddAfter(blocks.length - 1)}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <span>Add a block</span>
          </button>
        </div>

        <PageFooter
          pageId={page.id}
          reactions={reactions}
          onReact={onReact}
          pageThread={pageThread}
          onAddPageComment={onAddPageComment}
          onReplyPageComment={onReplyPageComment}
        />
      </div>

      {insertMenu && <BlockInsertMenu onClose={() => setInsertMenu(null)} onPick={(type) => insertBlock(insertMenu.idx, type)} />}
    </div>
  );
}

function BlockInsertMenu({ onClose, onPick }) {
  const [q, setQ] = useStateP("");
  const items = [
    { type: "h1", label: "Heading 1", desc: "Big section title", icon: "H₁" },
    { type: "h2", label: "Heading 2", desc: "Section title", icon: "H₂" },
    { type: "h3", label: "Heading 3", desc: "Subsection", icon: "H₃" },
    { type: "p", label: "Text", desc: "Paragraph", icon: "¶" },
    { type: "ul", label: "Bulleted list", desc: "Simple list", icon: "•" },
    { type: "ol", label: "Numbered list", desc: "Ordered list", icon: "1." },
    { type: "todo", label: "To-do list", desc: "Checkboxes", icon: "☐" },
    { type: "callout", label: "Callout", desc: "Highlighted note", icon: "ℹ" },
    { type: "code", label: "Code", desc: "Code block", icon: "</>" },
    { type: "quote", label: "Quote", desc: "Pull quote", icon: "❝" },
    { type: "divider", label: "Divider", desc: "Horizontal rule", icon: "—" },
    { type: "image", label: "Image", desc: "Upload or embed", icon: "🖼" },
    { type: "video", label: "Video", desc: "Embed video", icon: "▶" },
    { type: "table", label: "Table", desc: "Rows and columns", icon: "▦" }
  ];
  const filtered = q ? items.filter((it) => it.label.toLowerCase().includes(q.toLowerCase())) : items;
  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd cmd--insert" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>+</span>
          <input autoFocus className="cmd-input" placeholder="Insert block…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="cmd-list">
          {filtered.map((it) => (
            <button key={it.type} className="cmd-item" onClick={() => onPick(it.type)}>
              <span className="cmd-item-icon insert-ic">{it.icon}</span>
              <span className="cmd-item-title">{it.label}</span>
              <span className="cmd-item-sub">{it.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function makeBlankBlock(type) {
  switch (type) {
    case "h1": return { type: "h1", text: "Heading 1" };
    case "h2": return { type: "h2", text: "Heading 2" };
    case "h3": return { type: "h3", text: "Heading 3" };
    case "p": return { type: "p", text: [{ t: "Type something…" }] };
    case "ul": return { type: "ul", items: ["Item one", "Item two"] };
    case "ol": return { type: "ol", items: ["First", "Second"] };
    case "todo": return { type: "todo", items: [{ done: false, text: "Task one" }, { done: false, text: "Task two" }] };
    case "callout": return { type: "callout", tone: "info", text: "Add a note here." };
    case "code": return { type: "code", lang: "typescript", code: "const x = 1;" };
    case "quote": return { type: "quote", text: "A quote." };
    case "divider": return { type: "divider" };
    case "image": return { type: "image", caption: "Image caption", placeholder: "IMAGE" };
    case "video": return { type: "video", caption: "Video caption" };
    case "table": return { type: "table", headers: ["Column A", "Column B", "Column C"], rows: [["—", "—", "—"], ["—", "—", "—"]] };
    default: return { type: "p", text: [{ t: "" }] };
  }
}

window.PageView = PageView;
window.makeBlankBlock = makeBlankBlock;
