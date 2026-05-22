using System.Text.Json;
using Lumen.API.Data;
using Lumen.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Lumen.API.Services;

/// <summary>
/// Seeds SQLite from JSON files in <c>SeedData/</c> (copied next to the built assembly).
/// No external tools or npm scripts are required.
/// </summary>
public static class DataSeeder
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public const string DemoPassword = "lumen";

    /// <summary>
    /// Ensures schema repair ran, then seeds users/workspaces once and applies bundled catalog JSON.
    /// </summary>
    public static async Task InitializeAsync(IServiceProvider services)
    {
        var context = services.GetRequiredService<AppDbContext>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        if (!await context.Users.AnyAsync())
        {
            await SeedUsersAsync(userManager, context);
            SeedWorkspacesFromFile(context);
            await context.SaveChangesAsync();
        }

        SeedCatalogFromBundledFiles(context);
    }

    private static void SeedCatalogFromBundledFiles(AppDbContext context)
    {
        SeedPages(context);
        SeedComments(context);
        SeedReactions(context);
        SeedInbox(context);
        SeedNavigationTrees(context);
        context.SaveChanges();
    }

    private static async Task SeedUsersAsync(UserManager<ApplicationUser> userManager, AppDbContext context)
    {
        var demos = new (string Id, string Email, string Name, string Initial, string Color)[]
        {
            ("MC", "maya@lumen.dev", "Maya Chen", "M", "#ec4899"),
            ("JD", "jordan@lumen.dev", "Jordan Patel", "J", "#6366f1"),
            ("RP", "riley@lumen.dev", "Riley Park", "R", "#10b981"),
            ("DL", "devon@lumen.dev", "Devon Liu", "D", "#f59e0b"),
            ("SO", "sam@lumen.dev", "Sam Okafor", "S", "#8b5cf6"),
        };

        foreach (var (id, email, name, initial, color) in demos)
        {
            var user = new ApplicationUser
            {
                Id = id,
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                DisplayName = name,
                Initial = initial,
                Color = color,
            };
            var result = await userManager.CreateAsync(user, DemoPassword);
            if (!result.Succeeded)
                throw new InvalidOperationException(
                    $"Failed to seed user {id}: {string.Join("; ", result.Errors.Select(e => e.Description))}");
        }

        context.UserPreferences.Add(new UserPreference
        {
            UserId = "MC",
            Theme = "dark",
            Accent = "#ec4899",
            CurrentWorkspaceId = "acme",
            PageWidth = "wide",
            RecentPagesJson = "[\"engineering/auth-rfc\",\"welcome\"]",
        });
    }

    private static void SeedWorkspacesFromFile(AppDbContext context)
    {
        var path = RequireSeedFile("workspaces-seed.json");
        var items = JsonSerializer.Deserialize<WorkspaceSeed[]>(File.ReadAllText(path), JsonOpts) ?? [];
        foreach (var w in items)
        {
            if (context.Workspaces.Any(x => x.Id == w.Id)) continue;
            context.Workspaces.Add(new Workspace
            {
                Id = w.Id,
                Name = w.Name,
                Initial = w.Initial,
                Color = w.Color,
                Members = w.Members,
            });
        }
    }

    private static void SeedPages(AppDbContext context)
    {
        var path = RequireSeedFile("pages-catalog.json");
        var catalog = JsonSerializer.Deserialize<Dictionary<string, PageSeed>>(File.ReadAllText(path), JsonOpts);
        if (catalog == null) return;

        foreach (var (id, seed) in catalog)
        {
            if (context.Pages.Any(p => p.Id == id)) continue;

            var blocksJson = JsonSerializer.Serialize(seed.Blocks ?? []);
            context.Pages.Add(new Page
            {
                Id = id,
                Title = seed.Title ?? id,
                Icon = seed.Icon ?? "📄",
                Breadcrumb = seed.Breadcrumb ?? [seed.Title ?? id],
                Contributors = seed.Contributors ?? [],
                BlocksJson = blocksJson,
                MarkdownBody = seed.MarkdownBody,
                WorkspaceId = seed.WorkspaceId ?? "acme",
                UpdatedBy = seed.UpdatedBy ?? "MC",
                UpdatedAt = ParseUpdatedAt(seed.UpdatedAt),
                Version = seed.Version ?? 1,
                ShareJson = "[]",
                LinkSharingEnabled = false,
            });
        }
    }

    private static void SeedComments(AppDbContext context)
    {
        var path = RequireSeedFile("comments-seed.json");
        var rows = JsonSerializer.Deserialize<CommentSeed[]>(File.ReadAllText(path), JsonOpts) ?? [];
        foreach (var row in rows)
        {
            if (context.Comments.Any(c => c.Id == row.Id)) continue;
            context.Comments.Add(new Comment
            {
                Id = row.Id,
                Author = row.Author,
                Text = row.Text,
                At = row.At,
                Resolved = row.Resolved,
                PageId = row.PageId,
                BlockIdx = row.BlockIdx,
                ParentCommentId = row.ParentCommentId,
                RepliesJson = row.RepliesJson ?? "[]",
                ReactionsJson = row.ReactionsJson ?? "{}",
            });
        }
    }

    private static void SeedReactions(AppDbContext context)
    {
        var path = RequireSeedFile("reactions-seed.json");
        var rows = JsonSerializer.Deserialize<ReactionSeed[]>(File.ReadAllText(path), JsonOpts) ?? [];
        foreach (var row in rows)
        {
            var exists = context.Reactions.Any(r =>
                r.PageId == row.PageId && r.Emoji == row.Emoji && r.UserId == row.UserId);
            if (exists) continue;
            context.Reactions.Add(new Reaction
            {
                PageId = row.PageId,
                Emoji = row.Emoji,
                UserId = row.UserId,
            });
        }
    }

    private static void SeedInbox(AppDbContext context)
    {
        var path = RequireSeedFile("inbox-seed.json");
        var rows = JsonSerializer.Deserialize<InboxSeed[]>(File.ReadAllText(path), JsonOpts) ?? [];
        foreach (var row in rows)
        {
            if (context.InboxItems.Any(i => i.Id == row.Id)) continue;
            context.InboxItems.Add(new InboxItem
            {
                Id = row.Id,
                Author = row.Author,
                Verb = row.Verb,
                PageId = row.PageId,
                PageTitle = row.PageTitle,
                Snippet = row.Snippet,
                At = row.At,
                Unread = row.Unread,
                UserId = row.UserId,
            });
        }
    }

    private static void SeedNavigationTrees(AppDbContext context)
    {
        ApplyNavigationTreeIfEmpty(context, "acme", "navigation-tree.json");
        ApplyNavigationTreeIfEmpty(context, "personal", "navigation-tree.personal.json");
        ApplyNavigationTreeIfEmpty(context, "lab", "navigation-tree.lab.json");
    }

    private static void ApplyNavigationTreeIfEmpty(AppDbContext context, string workspaceId, string fileName)
    {
        var ws = context.Workspaces.FirstOrDefault(w => w.Id == workspaceId);
        if (ws == null || !string.IsNullOrWhiteSpace(ws.NavigationTreeJson)) return;

        var path = SeedPath(fileName);
        ws.NavigationTreeJson = File.Exists(path) ? File.ReadAllText(path).Trim() : "[]";
    }

    private static string RequireSeedFile(string fileName)
    {
        var path = SeedPath(fileName);
        if (!File.Exists(path))
        {
            throw new FileNotFoundException(
                $"Bundled seed file missing: {path}. Ensure SeedData is included in the Lumen.API build output.");
        }
        return path;
    }

    private static DateTime ParseUpdatedAt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return DateTime.UtcNow;
        if (DateTime.TryParse(value, out var dt)) return dt.ToUniversalTime();
        return DateTime.UtcNow;
    }

    private static string SeedPath(string file) =>
        Path.Combine(AppContext.BaseDirectory, "SeedData", file);

    private sealed class PageSeed
    {
        public string? Id { get; set; }
        public string? Title { get; set; }
        public string? Icon { get; set; }
        public List<string>? Breadcrumb { get; set; }
        public string? UpdatedBy { get; set; }
        public string? UpdatedAt { get; set; }
        public List<string>? Contributors { get; set; }
        public object[]? Blocks { get; set; }
        public string? MarkdownBody { get; set; }
        public string? WorkspaceId { get; set; }
        public int? Version { get; set; }
    }

    private sealed class CommentSeed
    {
        public string Id { get; set; } = "";
        public string Author { get; set; } = "";
        public string Text { get; set; } = "";
        public string At { get; set; } = "";
        public bool Resolved { get; set; }
        public string PageId { get; set; } = "";
        public int? BlockIdx { get; set; }
        public string? ParentCommentId { get; set; }
        public string? RepliesJson { get; set; }
        public string? ReactionsJson { get; set; }
    }

    private sealed class ReactionSeed
    {
        public string PageId { get; set; } = "";
        public string Emoji { get; set; } = "";
        public string UserId { get; set; } = "";
    }

    private sealed class InboxSeed
    {
        public string Id { get; set; } = "";
        public string Author { get; set; } = "";
        public string Verb { get; set; } = "";
        public string PageId { get; set; } = "";
        public string PageTitle { get; set; } = "";
        public string Snippet { get; set; } = "";
        public string At { get; set; } = "";
        public bool Unread { get; set; }
        public string UserId { get; set; } = "";
    }

    private sealed class WorkspaceSeed
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string Initial { get; set; } = "";
        public string Color { get; set; } = "";
        public int Members { get; set; }
    }
}
