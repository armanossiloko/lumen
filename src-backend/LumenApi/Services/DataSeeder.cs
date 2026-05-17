using LumenApi.Data;
using LumenApi.Models;
using System.Text.Json;

namespace LumenApi.Services;

public static class DataSeeder
{
    public static void SeedData(AppDbContext context)
    {
        if (context.Users.Any()) return; // Already seeded
        
        // Seed Users
        var users = new[]
        {
            new User { Id = "MC", Name = "Maya Chen", Initial = "M", Color = "#ec4899" },
            new User { Id = "JD", Name = "Jordan Patel", Initial = "J", Color = "#3b82f6" },
            new User { Id = "RP", Name = "Riley Park", Initial = "R", Color = "#10b981" },
            new User { Id = "DL", Name = "Devon Liu", Initial = "D", Color = "#f59e0b" },
            new User { Id = "SO", Name = "Sam Okafor", Initial = "S", Color = "#8b5cf6" }
        };
        context.Users.AddRange(users);
        
        // Seed Workspaces
        var workspaces = new[]
        {
            new Workspace { Id = "acme", Name = "Acme", Initial = "A", Color = "var(--accent)", Members = 87 },
            new Workspace { Id = "lab", Name = "Acme Labs", Initial = "L", Color = "#6366f1", Members = 12 },
            new Workspace { Id = "personal", Name = "Personal", Initial = "M", Color = "#10b981", Members = 1 }
        };
        context.Workspaces.AddRange(workspaces);
        
        // Seed Pages
        var authRfcBlocks = JsonSerializer.Serialize(new object[]
        {
            new { type = "h1", text = "RFC: Authentication v3" },
            new { type = "callout", tone = "info", text = new object[]
            {
                new { t = "Status: Accepted • Author: Jordan Patel • Reviewers: Riley Park, Devon Liu • Target: May 15, 2026" }
            }},
            new { type = "h2", text = "Summary" },
            new { type = "p", text = "We're replacing the current auth stack with a session-token model backed by signed cookies and a centralized session store. This eliminates three classes of bugs and unblocks SSO for enterprise customers." }
        });
        
        var pages = new[]
        {
            new Page
            {
                Id = "engineering/auth-rfc",
                Title = "RFC: Authentication v3",
                Icon = "🔐",
                BreadcrumbJson = JsonSerializer.Serialize(new[] { "Engineering", "RFCs", "Authentication v3" }),
                ContributorsJson = JsonSerializer.Serialize(new[] { "MC", "JD", "RP", "DL", "SO" }),
                BlocksJson = authRfcBlocks,
                UpdatedAt = DateTime.UtcNow.AddHours(-2),
                UpdatedBy = "JD",
                WorkspaceId = "acme"
            }
        };
        context.Pages.AddRange(pages);
        
        // Seed Comments
        var comments = new[]
        {
            new Comment
            {
                Id = "pc1",
                Author = "RP",
                Text = "Reviewed end-to-end — overall LGTM. Two threads above to address before we ship.",
                At = "Apr 30",
                Resolved = false,
                PageId = "engineering/auth-rfc",
                BlockIdx = null,
                RepliesJson = JsonSerializer.Serialize(new[]
                {
                    new { id = "pc1r1", author = "JD", text = "Both addressed in the latest revision. Re-requesting review.", at = "2h ago", resolved = false }
                }),
                ReactionsJson = JsonSerializer.Serialize(new Dictionary<string, List<string>>
                {
                    ["👍"] = new List<string> { "JD", "RP" },
                    ["🎉"] = new List<string> { "MC" }
                })
            }
        };
        context.Comments.AddRange(comments);
        
        // Seed Reactions
        var reactions = new[]
        {
            new Reaction { PageId = "engineering/auth-rfc", Emoji = "🚀", UserId = "RP" },
            new Reaction { PageId = "engineering/auth-rfc", Emoji = "🚀", UserId = "DL" },
            new Reaction { PageId = "engineering/auth-rfc", Emoji = "🚀", UserId = "MC" },
            new Reaction { PageId = "engineering/auth-rfc", Emoji = "👀", UserId = "SO" },
            new Reaction { PageId = "engineering/auth-rfc", Emoji = "✅", UserId = "JD" }
        };
        context.Reactions.AddRange(reactions);
        
        // Seed Inbox Items
        var inboxItems = new[]
        {
            new InboxItem
            {
                Id = "n1",
                Author = "RP",
                Verb = "commented on",
                PageId = "engineering/auth-rfc",
                PageTitle = "Authentication v3",
                Snippet = "Worth calling out that we're using ULIDs not UUIDs…",
                At = "2h ago",
                Unread = true,
                UserId = "MC"
            },
            new InboxItem
            {
                Id = "n2",
                Author = "DL",
                Verb = "edited",
                PageId = "engineering/auth-rfc",
                PageTitle = "Authentication v3",
                Snippet = "Updated rollout phase table",
                At = "Yesterday",
                Unread = true,
                UserId = "MC"
            }
        };
        context.InboxItems.AddRange(inboxItems);
        
        context.SaveChanges();
    }

    /// <summary>
    /// On every startup: fill navigation JSON when missing (migrated DBs).
    /// </summary>
    public static void EnsureNavigationTreeIfEmpty(AppDbContext context)
    {
        var ws = context.Workspaces.FirstOrDefault(w => w.Id == "acme");
        if (ws == null || !string.IsNullOrWhiteSpace(ws.NavigationTreeJson))
            return;

        var path = Path.Combine(AppContext.BaseDirectory, "SeedData", "navigation-tree.json");
        if (!File.Exists(path))
            return;

        ws.NavigationTreeJson = File.ReadAllText(path);
        context.SaveChanges();
    }

    /// <summary>
    /// Reset navigation tree from bundled JSON (fixes DBs where Engineering was saved as an orphan root folder).
    /// </summary>
    public static void SyncNavigationTreeFromFile(AppDbContext context)
    {
        var ws = context.Workspaces.FirstOrDefault(w => w.Id == "acme");
        if (ws == null) return;

        var path = Path.Combine(AppContext.BaseDirectory, "SeedData", "navigation-tree.json");
        if (!File.Exists(path)) return;

        ws.NavigationTreeJson = File.ReadAllText(path);
        context.SaveChanges();
    }

    /// <summary>
    /// Overwrites RFC page blocks from bundled JSON so the sample doc matches the rich in-app catalog
    /// (and fixes DBs seeded with the old minimal snippet). Safe to call on every startup for this demo.
    /// </summary>
    public static void SyncAuthRfcBlocksFromFile(AppDbContext context)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "SeedData", "engineering-auth-rfc-blocks.json");
        if (!File.Exists(path)) return;

        var json = File.ReadAllText(path).Trim();
        var page = context.Pages.FirstOrDefault(p => p.Id == "engineering/auth-rfc");
        if (page == null) return;

        page.BlocksJson = json;
        page.Icon = "📐";
        page.Title = "RFC: Authentication v3";
        page.MarkdownBody = null;
        context.SaveChanges();
    }
}
