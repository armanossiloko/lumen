using Lumen.API.Auth;
using Lumen.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Lumen.API.Hubs;

[Authorize]
public class LumenHub : Hub
{
    private readonly PresenceService _presence;

    public LumenHub(PresenceService presence) => _presence = presence;

    public static string UserGroup(string userId) => $"user:{userId}";
    public static string PageGroup(string pageId) => $"page:{pageId}";

    public async Task JoinPage(string pageId)
    {
        var userId = RequireUserId();
        if (string.IsNullOrWhiteSpace(pageId)) return;

        foreach (var leftPageId in _presence.LeaveAll(userId))
        {
            if (leftPageId != pageId)
                await BroadcastPresence(leftPageId);
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, PageGroup(pageId));
        _presence.Join(pageId, userId);
        await BroadcastPresence(pageId);
    }

    public Task TouchPage(string pageId)
    {
        var userId = RequireUserId();
        if (string.IsNullOrWhiteSpace(pageId)) return Task.CompletedTask;
        _presence.Touch(pageId, userId);
        return Task.CompletedTask;
    }

    public async Task LeavePage(string pageId)
    {
        var userId = RequireUserId();
        if (string.IsNullOrWhiteSpace(pageId)) return;

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, PageGroup(pageId));
        _presence.Leave(pageId, userId);
        await BroadcastPresence(pageId);
    }

    public async Task SubscribeInbox()
    {
        var userId = RequireUserId();
        await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId));
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.GetUserId();
        if (!string.IsNullOrWhiteSpace(userId))
        {
            foreach (var pageId in _presence.LeaveAll(userId))
                await BroadcastPresence(pageId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    private string RequireUserId()
    {
        var userId = Context.User?.GetUserId();
        if (string.IsNullOrWhiteSpace(userId))
            throw new HubException("Not signed in.");
        return userId;
    }

    private async Task BroadcastPresence(string pageId)
    {
        var viewers = _presence.GetViewers(pageId);
        await Clients.Group(PageGroup(pageId)).SendAsync("PresenceUpdated", new { pageId, viewers });
    }
}
