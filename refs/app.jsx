// Main app — wires sidebar + header + page view + overlays + tweaks
const { useState: useStateA, useRef: useRefA, useEffect: useEffectA, useMemo: useMemoA, useCallback: useCallbackA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "#ec4899",
  "pageWidth": "regular"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [tree, setTree] = useStateA(window.TREE);
  const [pages, setPages] = useStateA(window.PAGES);
  const [currentId, setCurrentId] = useStateA("engineering/auth-rfc");
  const [comments, setComments] = useStateA(window.DEFAULT_COMMENTS);
  const [pageComments, setPageComments] = useStateA(window.DEFAULT_PAGE_COMMENTS);
  const [reactions, setReactions] = useStateA(window.DEFAULT_REACTIONS);
  const [focusBlockIdx, setFocusBlockIdx] = useStateA(null);
  const [showCommentsPanel, setShowCommentsPanel] = useStateA(true);
  const [showCmd, setShowCmd] = useStateA(false);
  const [showShare, setShowShare] = useStateA(false);
  const [showActions, setShowActions] = useStateA(false);
  const [showInbox, setShowInbox] = useStateA(false);
  const [inbox, setInbox] = useStateA([
    { id: "n1", author: "RP", verb: "commented on", pageId: "engineering/auth-rfc", pageTitle: "Authentication v3", snippet: "Worth calling out that we're using ULIDs not UUIDs…", at: "2h ago", unread: true },
    { id: "n2", author: "DL", verb: "edited", pageId: "engineering/auth-rfc", pageTitle: "Authentication v3", snippet: "Updated rollout phase table", at: "Yesterday", unread: true },
    { id: "n3", author: "MC", verb: "shared", pageId: "product/roadmap", pageTitle: "Q2 2026 Roadmap", snippet: "Maya shared this with you", at: "2d ago", unread: false },
    { id: "n4", author: "SO", verb: "mentioned you in", pageId: "handbook/hiring", pageTitle: "Hiring Rubric", snippet: "@you can you review the comms dimension?", at: "3d ago", unread: true }
  ]);

  // Apply theme + accent at root
  useEffectA(() => {
    document.documentElement.dataset.theme = t.theme;
    document.documentElement.style.setProperty("--accent", t.accent);
  }, [t.theme, t.accent]);

  // ⌘K
  useEffectA(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setShowCmd((s) => !s);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const page = pages[currentId] || pages["welcome"];
  const blocks = page.blocks;
  const pageReactions = reactions[currentId] || {};
  const pageThread = pageComments[currentId] || [];

  // Filter comments to current page
  const pageThreadComments = useMemoA(() => {
    const out = {};
    Object.keys(comments).forEach((k) => {
      if (k.startsWith(currentId + "__")) out[k] = comments[k];
    });
    return out;
  }, [comments, currentId]);

  const blockMap = useMemoA(() => {
    const m = {};
    blocks.forEach((b, i) => {
      let text = "";
      if (typeof b.text === "string") text = b.text;
      else if (Array.isArray(b.text)) text = b.text.map(p => p.t || "").join("");
      else if (b.items) text = (Array.isArray(b.items) ? b.items.map(it => typeof it === "string" ? it : it.text).join(", ") : "");
      m[i] = text.slice(0, 60);
    });
    return m;
  }, [blocks]);

  const handleSelectPage = (id, opts) => {
    if (!pages[id] && opts && opts.isNew) {
      const titleParts = (opts.title || "Untitled").split("/");
      const newPage = {
        id, icon: "📄", title: opts.title || "Untitled",
        breadcrumb: ["Acme", opts.title || "Untitled"],
        updatedBy: "Maya Chen", updatedAt: "just now", contributors: ["MC"], version: 1,
        blocks: [
          { type: "h1", text: opts.title || "Untitled" },
          { type: "p", text: [{ t: "Start writing… or press " }, { t: "+", c: true }, { t: " on the left to insert a block." }] }
        ]
      };
      setPages((p) => ({ ...p, [id]: newPage }));
    }
    setCurrentId(id);
    setFocusBlockIdx(null);
  };

  const handleBlocksChange = (newBlocks) => {
    setPages((p) => ({ ...p, [currentId]: { ...p[currentId], blocks: newBlocks } }));
  };
  const handleTitleChange = (title) => {
    setPages((p) => ({ ...p, [currentId]: { ...p[currentId], title } }));
  };

  const handleAddComment = (blockIdx) => {
    const key = currentId + "__" + blockIdx;
    const text = prompt("Add a comment:");
    if (!text) return;
    setComments((c) => ({ ...c, [key]: [...(c[key] || []), { id: "c" + Date.now(), author: "YOU", text, at: "just now", resolved: false }] }));
    setShowCommentsPanel(true);
  };
  const handleResolveComment = (key) => {
    setComments((c) => ({ ...c, [key]: c[key].map((x) => ({ ...x, resolved: !x.resolved })) }));
  };
  const handleReplyComment = (key, text) => {
    setComments((c) => ({ ...c, [key]: [...c[key], { id: "c" + Date.now(), author: "YOU", text, at: "just now", resolved: false }] }));
  };
  const handleJumpToBlock = (blockIdx) => {
    setFocusBlockIdx(blockIdx);
    setTimeout(() => {
      const blocksEls = document.querySelectorAll(".blk");
      if (blocksEls[blockIdx]) blocksEls[blockIdx].scrollIntoView({ behavior: "smooth", block: "center" });
    }, 30);
  };

  const handleReact = (emoji) => {
    setReactions((r) => {
      const cur = r[currentId] || {};
      const users = cur[emoji] || [];
      const has = users.includes("YOU");
      const newUsers = has ? users.filter(u => u !== "YOU") : [...users, "YOU"];
      const newCur = { ...cur };
      if (newUsers.length === 0) delete newCur[emoji];
      else newCur[emoji] = newUsers;
      return { ...r, [currentId]: newCur };
    });
  };

  const handleAddPageComment = (text) => {
    setPageComments((p) => ({ ...p, [currentId]: [...(p[currentId] || []), { id: "pc" + Date.now(), author: "YOU", text, at: "just now", replies: [] }] }));
  };
  const handleReplyPageComment = (commentId, text) => {
    setPageComments((p) => ({
      ...p, [currentId]: (p[currentId] || []).map((c) => c.id === commentId ? { ...c, replies: [...(c.replies || []), { id: "pcr" + Date.now(), author: "YOU", text, at: "just now" }] } : c)
    }));
  };

  const unreadCount = inbox.filter(i => i.unread).length;
  const viewers = ["MC", "JD", "RP"];

  return (
    <div className={"app theme-" + t.theme + " width-" + t.pageWidth}>
      <Sidebar
        tree={tree}
        currentId={currentId}
        onSelect={handleSelectPage}
        onTreeChange={setTree}
        onOpenSearch={() => setShowCmd(true)}
        onOpenInbox={() => setShowInbox(true)}
        unreadCount={unreadCount}
      />
      <main className="main">
        <Header
          page={page}
          onSelect={handleSelectPage}
          theme={t.theme}
          onThemeChange={(v) => setTweak("theme", v)}
          onOpenSearch={() => setShowCmd(true)}
          onShare={() => setShowShare(true)}
          onOpenActions={() => setShowActions(true)}
          onOpenInbox={() => setShowInbox(true)}
          unreadCount={unreadCount}
          viewers={viewers}
        />
        <div className="main-body">
          <PageView
            page={page}
            onTitleChange={handleTitleChange}
            blocks={blocks}
            onBlocksChange={handleBlocksChange}
            comments={comments}
            onResolveComment={handleResolveComment}
            onReplyComment={handleReplyComment}
            onAddComment={handleAddComment}
            focusBlockIdx={focusBlockIdx}
            onFocusBlock={setFocusBlockIdx}
            reactions={pageReactions}
            onReact={handleReact}
            pageThread={pageThread}
            onAddPageComment={handleAddPageComment}
            onReplyPageComment={handleReplyPageComment}
            pageWidth={t.pageWidth}
            onSelectPage={handleSelectPage}
          />
          <CommentsPanel
            open={showCommentsPanel && Object.keys(pageThreadComments).length > 0}
            threads={pageThreadComments}
            page={page}
            blockMap={blockMap}
            onClose={() => setShowCommentsPanel(false)}
            onResolve={handleResolveComment}
            onReply={handleReplyComment}
            onJump={handleJumpToBlock}
            currentUser="YOU"
          />
        </div>
      </main>

      <CommandPalette
        open={showCmd}
        onClose={() => setShowCmd(false)}
        pages={pages}
        onSelect={(id) => handleSelectPage(id)}
        onCreatePage={(title) => {
          const id = "new/" + Date.now();
          setTree((tr) => addChildToFirst(tr, { id, title, icon: "📄", kind: "page" }));
          handleSelectPage(id, { title, isNew: true });
        }}
      />
      <ShareModal open={showShare} onClose={() => setShowShare(false)} page={page} />
      <PageActionsMenu open={showActions} onClose={() => setShowActions(false)} onAction={() => setShowActions(false)} />
      <InboxPanel
        open={showInbox}
        onClose={() => setShowInbox(false)}
        items={inbox}
        onMarkRead={(id) => setInbox((arr) => arr.map(i => i.id === id ? { ...i, unread: false } : i))}
        onJump={(pageId) => handleSelectPage(pageId)}
      />

      {/* Floating comments-panel toggle when threads are hidden */}
      {!showCommentsPanel && Object.keys(pageThreadComments).length > 0 && (
        <button className="cmt-fab" onClick={() => setShowCommentsPanel(true)} title="Show comments">
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 4a1 1 0 011-1h8a1 1 0 011 1v5a1 1 0 01-1 1H7l-3 3v-3H3a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/></svg>
          <span>{Object.values(pageThreadComments).flat().filter(c => !c.resolved).length}</span>
        </button>
      )}

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakRadio label="Mode" value={t.theme} options={["dark", "light"]} onChange={(v) => setTweak("theme", v)} />
        <TweakColor label="Accent" value={t.accent} onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Page width" value={t.pageWidth} options={["narrow", "regular", "wide"]} onChange={(v) => setTweak("pageWidth", v)} />
      </TweaksPanel>
    </div>
  );
}

function addChildToFirst(tree, child) {
  if (!tree.length) return tree;
  return [{ ...tree[0], children: [...(tree[0].children || []), child] }, ...tree.slice(1)];
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
