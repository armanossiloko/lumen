using Lumen.API.Data;
using Lumen.API.Hubs;
using Lumen.API.Models;
using Microsoft.AspNetCore.SignalR;

namespace Lumen.API.Services;

public class NotificationService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<LumenHub> _hub;

    public NotificationService(AppDbContext db, IHubContext<LumenHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    public async Task<InboxItem> NotifyAsync(
        string userId,
        string authorId,
        string verb,
        string pageId,
        string pageTitle,
        string snippet)
    {
        var item = new InboxItem
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            Author = authorId,
            Verb = verb,
            PageId = pageId,
            PageTitle = pageTitle,
            Snippet = snippet,
            At = DateTime.UtcNow.ToString("MMM d, h:mm tt"),
            Unread = true,
        };

        _db.InboxItems.Add(item);
        await _db.SaveChangesAsync();

        await _hub.Clients.Group(LumenHub.UserGroup(userId))
            .SendAsync("InboxItemAdded", new
            {
                item.Id,
                item.Author,
                item.Verb,
                item.PageId,
                item.PageTitle,
                item.Snippet,
                item.At,
                item.Unread,
            });

        return item;
    }

    public async Task NotifyPageContributorsAsync(
        string pageId,
        string authorId,
        string verb,
        string snippet,
        params string[] excludeUserIds)
    {
        var page = await _db.Pages.FindAsync(pageId);
        if (page == null) return;

        var exclude = new HashSet<string>(excludeUserIds, StringComparer.OrdinalIgnoreCase) { authorId };
        var targets = page.Contributors.Where(id => !exclude.Contains(id)).ToList();

        foreach (var userId in targets)
        {
            await NotifyAsync(userId, authorId, verb, pageId, page.Title, snippet);
        }
    }
}
