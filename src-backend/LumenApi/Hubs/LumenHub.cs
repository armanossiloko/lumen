using LumenApi.Services;
using Microsoft.AspNetCore.SignalR;

namespace LumenApi.Hubs;

public class LumenHub : Hub
{
    private readonly PresenceService _presence;

    public LumenHub(PresenceService presence)
    {
        _presence = presence;
    }

    public static string UserGroup(string userId) => $"user:{userId}";
    public static string PageGroup(string pageId) => $"page:{pageId}";

    public async Task JoinPage(string pageId, string userId)
    {
        if (string.IsNullOrWhiteSpace(pageId) || string.IsNullOrWhiteSpace(userId))
            return;

        foreach (var leftPageId in _presence.LeaveAll(userId))
        {
            if (leftPageId != pageId)
                await BroadcastPresence(leftPageId);
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, PageGroup(pageId));
        _presence.Join(pageId, userId);
        await BroadcastPresence(pageId);
    }

    public async Task TouchPage(string pageId, string userId)
    {
        if (string.IsNullOrWhiteSpace(pageId) || string.IsNullOrWhiteSpace(userId))
            return;
        _presence.Touch(pageId, userId);
    }

    public async Task LeavePage(string pageId, string userId)
    {
        if (string.IsNullOrWhiteSpace(pageId) || string.IsNullOrWhiteSpace(userId))
            return;

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, PageGroup(pageId));
        _presence.Leave(pageId, userId);
        await BroadcastPresence(pageId);
    }

    public async Task SubscribeInbox(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return;
        await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId));
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
        if (!string.IsNullOrWhiteSpace(userId))
        {
            foreach (var pageId in _presence.LeaveAll(userId))
                await BroadcastPresence(pageId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    private async Task BroadcastPresence(string pageId)
    {
        var viewers = _presence.GetViewers(pageId);
        await Clients.Group(PageGroup(pageId)).SendAsync("PresenceUpdated", new { pageId, viewers });
    }
}
