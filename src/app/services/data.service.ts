import { Injectable, signal } from '@angular/core';
import { AUTH_RFC_PAGE_ID, getAuthRfcCanonicalPage } from '../content/auth-rfc-canonical';
import { Page, TreeNode, Person, Comment, InboxItem, Workspace } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // Sample wiki content
  readonly pages = signal<{ [key: string]: Page }>({
    "welcome": {
      id: "welcome",
      icon: "✦",
      title: "Welcome to Lumen",
      breadcrumb: ["Welcome to Lumen"],
      updatedBy: "Maya Chen",
      updatedAt: "Apr 28, 2026",
      contributors: ["MC", "JD", "RP"],
      version: 14,
      blocks: [
        { type: "h1", text: "Welcome to Lumen" },
        { type: "callout", tone: "info", text: "This is your team's source of truth. Everything written here is searchable, comment-able, and version-controlled. Use the sidebar to navigate." },
        { type: "p", text: [
          { t: "Lumen is the " }, { t: "single home", b: true }, { t: " for everything Acme — engineering RFCs, product specs, runbooks, onboarding, and the company handbook. Press " }, { t: "⌘K", c: true }, { t: " from anywhere to jump to a page." }
        ]},
        { type: "h2", text: "Where to start" },
        { type: "p", text: [{ t: "If you're new, the " }, { t: "Engineering Onboarding", l: "engineering/onboarding" }, { t: " page walks you through your first two weeks. Product folks should start with the " }, { t: "Q2 Roadmap", l: "product/roadmap" }, { t: "." }] },
        { type: "ul", items: ["Read the team handbook", "Set up your dev environment", "Skim the active RFCs", "Say hi in #introductions"] },
        { type: "h2", text: "Conventions" },
        { type: "p", text: [{ t: "Pages are organized by team. Drafts live under your personal space. Use " }, { t: "callouts", c: true }, { t: " for important notes, " }, { t: "tables", c: true }, { t: " for structured comparisons, and inline comments to ask questions without disrupting the flow." }] },
        { type: "divider" },
        { type: "h2", text: "Recently updated" },
        { type: "table", headers: ["Page", "Owner", "Updated"], rows: [
          ["Authentication v3 RFC", "Jordan Patel", "2h ago"],
          ["Q2 Product Roadmap", "Maya Chen", "Yesterday"],
          ["Incident response runbook", "Riley Park", "2 days ago"],
          ["Hiring rubric — Senior IC", "Sam Okafor", "Apr 24"]
        ]}
      ]
    },
    "engineering": {
      id: "engineering",
      icon: "⌘",
      title: "Engineering",
      breadcrumb: ["Engineering"],
      updatedBy: "Jordan Patel",
      updatedAt: "Apr 30, 2026",
      contributors: ["JD", "RP", "MC", "SO"],
      version: 47,
      blocks: [
        { type: "h1", text: "Engineering" },
        { type: "p", text: [{ t: "The engineering org at Acme. Find RFCs, runbooks, architecture docs, and onboarding here." }] },
        { type: "h2", text: "Active workstreams" },
        { type: "ul", items: ["Auth v3 migration (target: May 15)", "Edge cache rollout — phase 2", "Observability platform consolidation", "Hiring: 3 senior IC roles open"] },
        { type: "h2", text: "Owners" },
        { type: "table", headers: ["Area", "Owner", "Backup"], rows: [
          ["Platform", "Riley Park", "Jordan Patel"],
          ["Frontend", "Maya Chen", "Sam Okafor"],
          ["Data", "Devon Liu", "Riley Park"],
          ["Infra", "Sam Okafor", "Jordan Patel"]
        ]}
      ]
    },
    "engineering/onboarding": {
      id: "engineering/onboarding",
      icon: "🌱",
      title: "Engineering Onboarding",
      breadcrumb: ["Engineering", "Onboarding"],
      updatedBy: "Riley Park",
      updatedAt: "Apr 22, 2026",
      contributors: ["RP", "JD", "MC"],
      version: 28,
      blocks: [
        { type: "h1", text: "Engineering Onboarding" },
        { type: "p", text: [{ t: "Welcome! This page walks you through your first two weeks. Check things off as you go — your buddy will follow along." }] },
        { type: "h2", text: "Week 1: Setup" },
        { type: "todo", items: [
          { done: true, text: "Get your laptop and accounts from IT" },
          { done: true, text: "Clone the monorepo and run the dev server" },
          { done: false, text: "Pair with your buddy on a starter ticket", commentCount: 2 },
          { done: false, text: "Attend the Friday architecture walkthrough" },
          { done: false, text: "Set up VPN and prod read-only access" }
        ]},
        { type: "h2", text: "Local dev quickstart" },
        { type: "code", lang: "bash", code: "git clone git@github.com:acme/monorepo.git\ncd monorepo\npnpm install\npnpm dev\n# Then visit http://localhost:3000" },
        { type: "callout", tone: "warn", text: "If pnpm install fails on macOS, you probably need to install the Xcode CLT first: xcode-select --install" },
        { type: "h2", text: "Week 2: First contributions" },
        { type: "ol", items: [
          "Pick a 'good first issue' from the backlog",
          "Open a draft PR by Wednesday",
          "Get a review from your buddy and one platform engineer",
          "Ship it — and write a short note in #shipped"
        ]},
        { type: "h2", text: "Reading list" },
        { type: "p", text: [{ t: "Skim the " }, { t: "Authentication v3 RFC", l: "engineering/auth-rfc" }, { t: " and the " }, { t: "Incident response runbook", l: "engineering/incidents" }, { t: ". Don't try to read everything — just enough to know what's there." }] },
        { type: "h3", text: "Who to ask" },
        { type: "p", text: [{ t: "Your buddy first, then your manager, then " }, { t: "#eng-help", c: true }, { t: ". For platform questions, Riley Park is the patient one." }] }
      ]
    },
    [AUTH_RFC_PAGE_ID]: getAuthRfcCanonicalPage(),
    "engineering/incidents": {
      id: "engineering/incidents",
      icon: "🚨",
      title: "Incident Response Runbook",
      breadcrumb: ["Engineering", "Runbooks", "Incidents"],
      updatedBy: "Riley Park",
      updatedAt: "2 days ago",
      contributors: ["RP", "JD", "SO"],
      version: 31,
      blocks: [
        { type: "h1", text: "Incident Response Runbook" },
        { type: "callout", tone: "danger", text: "If production is down right now: page the on-call via PagerDuty, then post in #incidents. Don't try to fix it alone." },
        { type: "h2", text: "Severity levels" },
        { type: "table", headers: ["Sev", "Definition", "Response time", "Comms"], rows: [
          ["SEV1", "Customer-facing outage", "5 min", "Status page + email"],
          ["SEV2", "Major feature degraded", "15 min", "Status page"],
          ["SEV3", "Minor degradation", "1 hour", "Internal only"],
          ["SEV4", "Cosmetic / single user", "Next business day", "Ticket"]
        ]},
        { type: "h2", text: "First 15 minutes" },
        { type: "ol", items: [
          "Acknowledge the page in PagerDuty",
          "Open #incidents and post 'I'm IC' (incident commander)",
          "Spin up the incident Zoom — link is in the channel topic",
          "Decide severity — when in doubt, go higher",
          "Update the status page within 5 minutes"
        ]},
        { type: "h2", text: "Useful queries" },
        { type: "code", lang: "sql", code: "-- Error rate by service, last 30 min\nSELECT service, COUNT(*) AS errors\nFROM logs\nWHERE level = 'error'\n  AND ts > NOW() - INTERVAL '30 minutes'\nGROUP BY service\nORDER BY errors DESC;" },
        { type: "video", caption: "Walkthrough: declaring an incident (4 min)" },
        { type: "h2", text: "After the incident" },
        { type: "p", text: [{ t: "Write a postmortem within 5 business days. Use the " }, { t: "postmortem template", l: "#" }, { t: ". Blameless. Focus on systems, not people." }] }
      ]
    },
    "engineering/architecture": {
      id: "engineering/architecture",
      icon: "🏗",
      title: "System Architecture",
      breadcrumb: ["Engineering", "Architecture"],
      updatedBy: "Devon Liu",
      updatedAt: "Apr 18, 2026",
      contributors: ["DL", "RP", "JD"],
      version: 22,
      blocks: [
        { type: "h1", text: "System Architecture" },
        { type: "p", text: [{ t: "A high-level view of how Acme's services fit together. For component-level docs, see each service's README." }] },
        { type: "image", caption: "Service topology — updated quarterly", placeholder: "ARCHITECTURE DIAGRAM" },
        { type: "h2", text: "Core services" },
        { type: "ul", items: ["api-gateway — routing & auth", "core-api — business logic", "worker — async jobs", "edge — CDN-adjacent rendering", "data-pipe — ETL"] }
      ]
    },
    "product": {
      id: "product",
      icon: "◐",
      title: "Product",
      breadcrumb: ["Product"],
      updatedBy: "Maya Chen",
      updatedAt: "Yesterday",
      contributors: ["MC", "SO", "JD"],
      version: 18,
      blocks: [
        { type: "h1", text: "Product" },
        { type: "p", text: [{ t: "Product strategy, roadmaps, and specs. For research notes and customer interviews, see the Research subspace." }] },
        { type: "h2", text: "This quarter" },
        { type: "ul", items: ["Ship Auth v3 (with Eng) — May", "Launch Workspaces — June", "Pricing v2 experiment — June"] }
      ]
    },
    "product/roadmap": {
      id: "product/roadmap",
      icon: "🗺",
      title: "Q2 2026 Roadmap",
      breadcrumb: ["Product", "Q2 2026 Roadmap"],
      updatedBy: "Maya Chen",
      updatedAt: "Yesterday",
      contributors: ["MC", "SO", "JD", "DL"],
      version: 12,
      blocks: [
        { type: "h1", text: "Q2 2026 Roadmap" },
        { type: "callout", tone: "info", text: "This is the source of truth for Q2. Updated weekly during Monday product sync. Last sync: Apr 27." },
        { type: "h2", text: "North-star goals" },
        { type: "ol", items: [
          "Activate 30% more new signups by improving onboarding",
          "Reduce time-to-first-value from 14 days to under 5",
          "Land 3 enterprise pilots"
        ]},
        { type: "h2", text: "Initiatives" },
        { type: "table", headers: ["Initiative", "Owner", "Status", "ETA"], rows: [
          ["Auth v3 + SSO", "Jordan", "● On track", "May 15"],
          ["Workspaces GA", "Maya", "● On track", "June 6"],
          ["Pricing v2 test", "Sam", "◐ At risk", "June 20"],
          ["Mobile companion", "Devon", "○ Planning", "Late Q2"]
        ]},
        { type: "h2", text: "Not doing this quarter" },
        { type: "ul", items: ["AI summaries — moved to Q3", "Public API v2 — pending capacity", "Native desktop app"] },
        { type: "h3", text: "Why we cut these" },
        { type: "p", text: [{ t: "We had ~6 weeks of capacity to allocate after Auth v3 and Workspaces. AI summaries depend on a vendor decision we haven't made yet, and the public API v2 needs platform work that's slipping. Both will be re-evaluated for Q3 planning." }] }
      ]
    },
    "product/research": {
      id: "product/research",
      icon: "🔍",
      title: "User Research",
      breadcrumb: ["Product", "Research"],
      updatedBy: "Sam Okafor",
      updatedAt: "Apr 19, 2026",
      contributors: ["SO", "MC"],
      version: 7,
      blocks: [
        { type: "h1", text: "User Research" },
        { type: "p", text: [{ t: "Interview notes, survey results, and synthesis docs from the research team." }] },
        { type: "h2", text: "Recent studies" },
        { type: "ul", items: ["Onboarding friction — 12 interviews (Apr)", "Pricing perception survey — 480 responses", "Workspace mental models — diary study"] }
      ]
    },
    "handbook": {
      id: "handbook",
      icon: "📘",
      title: "Company Handbook",
      breadcrumb: ["Handbook"],
      updatedBy: "Sam Okafor",
      updatedAt: "Apr 24, 2026",
      contributors: ["SO", "MC"],
      version: 53,
      blocks: [
        { type: "h1", text: "Company Handbook" },
        { type: "p", text: [{ t: "How we work at Acme. Living document — propose changes via PR." }] },
        { type: "h2", text: "Sections" },
        { type: "ul", items: ["Values & operating principles", "Compensation & benefits", "Time off & flexibility", "Hiring & interviewing", "Performance & feedback"] }
      ]
    },
    "handbook/values": {
      id: "handbook/values",
      icon: "✦",
      title: "Operating Principles",
      breadcrumb: ["Handbook", "Operating Principles"],
      updatedBy: "Maya Chen",
      updatedAt: "Mar 30, 2026",
      contributors: ["MC", "SO"],
      version: 8,
      blocks: [
        { type: "h1", text: "Operating Principles" },
        { type: "p", text: [{ t: "These are the principles we hire, promote, and give feedback against. They're not aspirational — if you see them being violated, call it out." }] },
        { type: "h3", text: "1. Default to writing" },
        { type: "p", text: [{ t: "Most decisions deserve a written doc. Writing forces clarity, gives async folks a fair shot, and creates a record we can revisit." }] },
        { type: "h3", text: "2. Prefer reversible decisions" },
        { type: "p", text: [{ t: "Move fast on things you can undo. Slow down on things you can't." }] },
        { type: "h3", text: "3. Strong opinions, loosely held" },
        { type: "quote", text: "Have a take. Bring evidence. Update when better evidence shows up. The goal is the right answer, not your answer." },
        { type: "h3", text: "4. Teach, don't gatekeep" },
        { type: "p", text: [{ t: "Knowledge in your head is a liability. Get it on a page." }] }
      ]
    },
    "handbook/hiring": {
      id: "handbook/hiring",
      icon: "👥",
      title: "Hiring Rubric",
      breadcrumb: ["Handbook", "Hiring Rubric"],
      updatedBy: "Sam Okafor",
      updatedAt: "Apr 24, 2026",
      contributors: ["SO", "JD", "MC"],
      version: 14,
      blocks: [
        { type: "h1", text: "Hiring Rubric — Senior IC" },
        { type: "callout", tone: "info", text: "Use this rubric for all senior IC interviews. Fill out the scorecard within 24h of the interview." },
        { type: "h2", text: "Dimensions" },
        { type: "table", headers: ["Dimension", "Weight", "Bar"], rows: [
          ["Technical depth", "30%", "Can lead design of a system spanning 3+ services"],
          ["Communication", "25%", "Writes clearly; surfaces tradeoffs"],
          ["Collaboration", "20%", "Actively unblocks others"],
          ["Ownership", "15%", "Drives work without prompting"],
          ["Values fit", "10%", "Demonstrates our principles"]
        ]}
      ]
    },
    "handbook/comp": {
      id: "handbook/comp",
      icon: "💰",
      title: "Compensation",
      breadcrumb: ["Handbook", "Compensation"],
      updatedBy: "Sam Okafor",
      updatedAt: "Apr 20, 2026",
      contributors: ["SO", "MC"],
      version: 11,
      blocks: [
        { type: "h1", text: "Compensation" },
        { type: "callout", tone: "info", text: "Confidential — do not share bands externally. Questions go to #people-ops or your manager." },
        { type: "p", text: [{ t: "We pay for impact, not tenure. Bands are reviewed twice a year against market data; individual comp is set at offer and adjusted through promotion or exceptional-scope changes." }] },
        { type: "h2", text: "How bands work" },
        { type: "ul", items: [
          "Each level has a base salary range and equity grant guidelines",
          "Geo adjustments apply for non–SF/NY hubs (see the internal calculator)",
          "Annual refresh grants target retention for strong performers",
          "Sign-on equity is used sparingly for competitive offers"
        ]},
        { type: "h2", text: "Benefits snapshot" },
        { type: "table", headers: ["Benefit", "Details"], rows: [
          ["Health", "100% employee premium; 80% dependents"],
          ["401(k)", "4% match, immediate vesting"],
          ["Parental leave", "16 weeks primary / 8 weeks secondary"],
          ["Learning", "$2,500/yr stipend"]
        ]},
        { type: "p", text: [{ t: "For time away from work, see " }, { t: "Time off", l: "handbook/timeoff" }, { t: "." }] }
      ]
    },
    "handbook/timeoff": {
      id: "handbook/timeoff",
      icon: "🌴",
      title: "Time off",
      breadcrumb: ["Handbook", "Time off"],
      updatedBy: "Sam Okafor",
      updatedAt: "Apr 18, 2026",
      contributors: ["SO", "MC"],
      version: 9,
      blocks: [
        { type: "h1", text: "Time off" },
        { type: "p", text: [{ t: "Take the time you need to stay healthy and effective. We don't count PTO days — managers and teams coordinate coverage instead." }] },
        { type: "h2", text: "Guidelines" },
        { type: "ul", items: [
          "Post in your team channel before multi-day absences",
          "Mark OOO on the calendar and set Slack status",
          "For 2+ weeks, loop in your manager early for handoff planning",
          "Company holidays are listed in Rippling; no need to file PTO for those"
        ]},
        { type: "h2", text: "Leave types" },
        { type: "table", headers: ["Type", "Notes"], rows: [
          ["Flexible PTO", "Default for vacation and personal days"],
          ["Sick", "No doctor's note required for short absences"],
          ["Bereavement", "Up to 5 days; talk to People Ops for extensions"],
          ["Sabbatical", "Eligible after 4 years — proposal required"]
        ]},
        { type: "callout", tone: "warn", text: "If you're burning out, talk to your manager or People Ops before you disappear. We'd rather adjust workload than lose you." }
      ]
    },
    "drafts/notes": {
      id: "drafts/notes",
      icon: "✎",
      title: "Random thoughts",
      breadcrumb: ["Maya Chen", "Drafts", "Random thoughts"],
      updatedBy: "Maya Chen",
      updatedAt: "10 min ago",
      contributors: ["MC"],
      version: 3,
      blocks: [
        { type: "h1", text: "Random thoughts" },
        { type: "p", text: [{ t: "Stuff I want to remember but isn't ready for a real page yet." }] },
        { type: "ul", items: ["The onboarding metric is still wrong", "Ask Devon about the pipeline backlog", "Q3 planning kickoff — late May"] }
      ]
    }
  });

  // Sidebar tree structure
  readonly tree = signal<TreeNode[]>([
    {
      id: "workspace-acme", title: "Acme", kind: "workspace",
      children: [
        { id: "welcome", title: "Welcome to Lumen", icon: "✦", kind: "page" },
        {
          id: "engineering", title: "Engineering", icon: "⌘", kind: "page",
          children: [
            { id: "engineering/onboarding", title: "Onboarding", icon: "🌱", kind: "page" },
            { id: "engineering/architecture", title: "System Architecture", icon: "🏗", kind: "page" },
            {
              id: "engineering/rfcs", title: "RFCs", icon: "📐", kind: "folder",
              children: [
                { id: "engineering/auth-rfc", title: "Authentication v3", icon: "📐", kind: "page" },
                { id: "engineering/rfc-cache", title: "Edge cache rollout", icon: "📐", kind: "page" },
                { id: "engineering/rfc-obs", title: "Observability platform", icon: "📐", kind: "page" }
              ]
            },
            {
              id: "engineering/runbooks", title: "Runbooks", icon: "📓", kind: "folder",
              children: [
                { id: "engineering/incidents", title: "Incident response", icon: "🚨", kind: "page" },
                { id: "engineering/deploys", title: "Deploys & rollbacks", icon: "🚀", kind: "page" },
                { id: "engineering/db-ops", title: "Database operations", icon: "🗄", kind: "page" }
              ]
            }
          ]
        },
        {
          id: "product", title: "Product", icon: "◐", kind: "page",
          children: [
            { id: "product/roadmap", title: "Q2 2026 Roadmap", icon: "🗺", kind: "page" },
            { id: "product/research", title: "User Research", icon: "🔍", kind: "page" },
            { id: "product/specs", title: "Specs", icon: "📋", kind: "folder", children: [
              { id: "product/spec-workspaces", title: "Workspaces GA", icon: "📋", kind: "page" },
              { id: "product/spec-pricing", title: "Pricing v2", icon: "📋", kind: "page" }
            ]}
          ]
        },
        {
          id: "handbook", title: "Handbook", icon: "📘", kind: "page",
          children: [
            { id: "handbook/values", title: "Operating Principles", icon: "✦", kind: "page" },
            { id: "handbook/hiring", title: "Hiring Rubric", icon: "👥", kind: "page" },
            { id: "handbook/comp", title: "Compensation", icon: "💰", kind: "page" },
            { id: "handbook/timeoff", title: "Time off", icon: "🌴", kind: "page" }
          ]
        }
      ]
    },
    {
      id: "private", title: "Private", kind: "workspace",
      children: [
        {
          id: "drafts", title: "Drafts", icon: "✎", kind: "folder",
          children: [
            { id: "drafts/notes", title: "Random thoughts", icon: "✎", kind: "page" },
            { id: "drafts/q3-plan", title: "Q3 planning notes", icon: "✎", kind: "page" }
          ]
        }
      ]
    }
  ]);

  // People for avatars / comments
  readonly people = signal<{ [key: string]: Person }>({
    "MC": { name: "Maya Chen", color: "#ec4899" },
    "JD": { name: "Jordan Patel", color: "#6366f1" },
    "RP": { name: "Riley Park", color: "#10b981" },
    "DL": { name: "Devon Liu", color: "#f59e0b" },
    "SO": { name: "Sam Okafor", color: "#8b5cf6" },
    "YOU": { name: "You", color: "#64748b" }
  });

  // Default comment threads keyed by pageId__blockIdx
  readonly defaultComments = signal<{ [key: string]: Comment[] }>({
    "engineering/auth-rfc__5": [
      {
        id: "c1",
        author: "RP",
        text: "Worth calling out that we're using ULIDs not UUIDs — different sort behavior matters for the index strategy.",
        at: "Apr 28",
        resolved: false,
        reactions: { '👀': ['JD', 'MC'] },
      },
    ],
    "engineering/auth-rfc__7": [
      { id: "c2", author: "DL", text: "Should we add a row for the rollback drill we did last week?", at: "Apr 30", resolved: false },
      { id: "c3", author: "JD", text: "Good call — adding it now.", at: "Apr 30", resolved: false }
    ],
    "product/roadmap__5": [
      { id: "c4", author: "SO", text: "Pricing v2 timing concerns me — the experiment design isn't locked. Can we sync Thursday?", at: "Yesterday", resolved: false }
    ]
  });

  readonly defaultPageComments = signal<{ [key: string]: Comment[] }>({
    "engineering/auth-rfc": [
      {
        id: "pc1",
        author: "RP",
        text: "Reviewed end-to-end — overall LGTM. Two threads above to address before we ship.",
        at: "Apr 30",
        resolved: false,
        reactions: { '👍': ['JD', 'RP'], '🎉': ['MC'] },
        replies: [
          {
            id: "pc1r1",
            author: "JD",
            text: "Both addressed in the latest revision. Re-requesting review.",
            at: "2h ago",
            resolved: false,
            reactions: { '❤️': ['RP'] },
          },
        ],
      },
    ]
  });

  readonly defaultReactions = signal<{ [key: string]: { [emoji: string]: string[] } }>({
    "welcome": { "👋": ["MC", "JD", "RP"], "🎉": ["DL"] },
    "engineering/auth-rfc": { "🚀": ["RP", "DL", "MC"], "👀": ["SO"], "✅": ["JD"] },
    "engineering/onboarding": { "🌱": ["MC", "SO"], "❤️": ["RP"] },
    "product/roadmap": { "🔥": ["JD", "DL"], "👀": ["SO", "RP"] },
    "handbook/values": { "💯": ["MC", "JD", "RP", "DL", "SO"] }
  });

  readonly defaultInbox = signal<InboxItem[]>([
    { id: "n1", author: "RP", verb: "commented on", pageId: "engineering/auth-rfc", pageTitle: "Authentication v3", snippet: "Worth calling out that we're using ULIDs not UUIDs…", at: "2h ago", unread: true },
    { id: "n2", author: "DL", verb: "edited", pageId: "engineering/auth-rfc", pageTitle: "Authentication v3", snippet: "Updated rollout phase table", at: "Yesterday", unread: true },
    { id: "n3", author: "MC", verb: "shared", pageId: "product/roadmap", pageTitle: "Q2 2026 Roadmap", snippet: "Maya shared this with you", at: "2d ago", unread: false },
    { id: "n4", author: "SO", verb: "mentioned you in", pageId: "handbook/hiring", pageTitle: "Hiring Rubric", snippet: "@you can you review the comms dimension?", at: "3d ago", unread: true }
  ]);

  readonly workspaces = signal<Workspace[]>([
    { id: "acme", name: "Acme", initial: "A", color: "var(--accent)", members: 87 },
    { id: "lab", name: "Acme Labs", initial: "L", color: "#6366f1", members: 12 },
    { id: "personal", name: "Personal", initial: "M", color: "#10b981", members: 1 }
  ]);
}
