using Lumen.API.Data;
using Lumen.API.Models;
using Lumen.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Lumen.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InboxController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly NotificationService _notifications;

    public InboxController(AppDbContext context, NotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    [HttpGet]
    public async Task<ActionResult<List<InboxItem>>> GetInboxItems([FromQuery] string userId = "MC")
    {
        var items = await _context.InboxItems
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.At)
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<InboxItem>> CreateInboxItem([FromBody] JsonElement body)
    {
        var userId = body.TryGetProperty("userId", out var u) ? u.GetString() ?? "MC" : "MC";
        var author = body.TryGetProperty("author", out var a) ? a.GetString() ?? "MC" : "MC";
        var verb = body.TryGetProperty("verb", out var v) ? v.GetString() ?? "notified you" : "notified you";
        var pageId = body.TryGetProperty("pageId", out var p) ? p.GetString() ?? "" : "";
        var pageTitle = body.TryGetProperty("pageTitle", out var pt) ? pt.GetString() ?? "" : "";
        var snippet = body.TryGetProperty("snippet", out var s) ? s.GetString() ?? "" : "";

        var item = await _notifications.NotifyAsync(userId, author, verb, pageId, pageTitle, snippet);
        return Ok(item);
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead([FromQuery] string userId = "MC")
    {
        var items = await _context.InboxItems.Where(i => i.UserId == userId && i.Unread).ToListAsync();
        foreach (var item in items)
            item.Unread = false;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(string id)
    {
        var item = await _context.InboxItems.FindAsync(id);
        if (item == null) return NotFound();

        item.Unread = false;
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
