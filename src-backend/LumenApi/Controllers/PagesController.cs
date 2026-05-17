using LumenApi.Data;
using LumenApi.Models;
using LumenApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace LumenApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PagesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly NotificationService _notifications;

    public PagesController(AppDbContext context, NotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    [HttpGet]
    public async Task<ActionResult<Dictionary<string, object>>> GetAllPages(
        [FromQuery] string? workspaceId = null,
        [FromQuery] bool includeDeleted = false)
    {
        var query = _context.Pages.AsQueryable();
        if (!includeDeleted)
            query = query.Where(p => p.DeletedAt == null);
        if (!string.IsNullOrWhiteSpace(workspaceId))
            query = query.Where(p => p.WorkspaceId == workspaceId);

        var pages = await query.ToListAsync();
        var result = pages.ToDictionary(p => p.Id, p => (object)SerializePage(p));
        return Ok(result);
    }

    [HttpGet("trash")]
    public async Task<ActionResult<object[]>> GetTrash([FromQuery] string? workspaceId = null)
    {
        var query = _context.Pages.Where(p => p.DeletedAt != null);
        if (!string.IsNullOrWhiteSpace(workspaceId))
            query = query.Where(p => p.WorkspaceId == workspaceId);

        var pages = await query.OrderByDescending(p => p.DeletedAt).ToListAsync();
        return Ok(pages.Select(p => SerializePage(p)).ToArray());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetPage(string id)
    {
        var page = await _context.Pages.FindAsync(id);
        if (page == null || page.DeletedAt != null) return NotFound();
        return Ok(SerializePage(page));
    }

    [HttpPost]
    public async Task<IActionResult> CreatePage([FromBody] JsonElement body)
    {
        if (!body.TryGetProperty("id", out var idEl))
            return BadRequest(new { error = "id is required" });

        var id = idEl.GetString();
        if (string.IsNullOrWhiteSpace(id))
            return BadRequest(new { error = "id must be non-empty" });

        if (await _context.Pages.FindAsync(id) != null)
            return Conflict(new { error = "A page with this id already exists" });

        var page = BuildPageFromJson(id, body);
        _context.Pages.Add(page);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPage), new { id = page.Id }, new { page.Id });
    }

    [HttpPost("{id}/duplicate")]
    public async Task<ActionResult<object>> DuplicatePage(string id, [FromQuery] string userId = "MC")
    {
        var source = await _context.Pages.FindAsync(id);
        if (source == null || source.DeletedAt != null) return NotFound();

        var newId = id + "-copy";
        var n = 2;
        while (await _context.Pages.FindAsync(newId) != null)
            newId = $"{id}-copy-{n++}";

        var copy = new Page
        {
            Id = newId,
            Title = source.Title + " (copy)",
            Icon = source.Icon,
            BreadcrumbJson = source.BreadcrumbJson,
            ContributorsJson = JsonSerializer.Serialize(
                source.Contributors.Contains(userId) ? source.Contributors : source.Contributors.Append(userId)),
            BlocksJson = source.BlocksJson,
            MarkdownBody = source.MarkdownBody,
            WorkspaceId = source.WorkspaceId,
            ShareJson = source.ShareJson,
            LinkSharingEnabled = source.LinkSharingEnabled,
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = userId,
        };

        _context.Pages.Add(copy);
        await _context.SaveChangesAsync();
        return Ok(new { id = copy.Id, page = SerializePage(copy) });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePage(string id, [FromBody] JsonElement updates)
    {
        var page = await _context.Pages.FindAsync(id);
        if (page == null || page.DeletedAt != null)
            return NotFound();

        await SaveVersionSnapshot(page);

        if (updates.TryGetProperty("title", out var title))
            page.Title = title.GetString() ?? page.Title;
        if (updates.TryGetProperty("icon", out var icon))
            page.Icon = icon.GetString() ?? page.Icon;
        if (updates.TryGetProperty("blocks", out var blocks))
            page.BlocksJson = blocks.GetRawText();
        if (updates.TryGetProperty("markdownBody", out var md))
            page.MarkdownBody = md.ValueKind == JsonValueKind.Null ? null : md.GetString();
        if (updates.TryGetProperty("breadcrumb", out var bc) && bc.ValueKind == JsonValueKind.Array)
            page.Breadcrumb = JsonSerializer.Deserialize<List<string>>(bc.GetRawText()) ?? page.Breadcrumb;
        if (updates.TryGetProperty("contributors", out var contr) && contr.ValueKind == JsonValueKind.Array)
            page.Contributors = JsonSerializer.Deserialize<List<string>>(contr.GetRawText()) ?? page.Contributors;
        if (updates.TryGetProperty("updatedBy", out var ub))
            page.UpdatedBy = ub.GetString();

        page.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> SoftDeletePage(string id)
    {
        var page = await _context.Pages.FindAsync(id);
        if (page == null) return NotFound();
        page.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/restore")]
    public async Task<IActionResult> RestorePage(string id)
    {
        var page = await _context.Pages.FindAsync(id);
        if (page == null) return NotFound();
        page.DeletedAt = null;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id}/share")]
    public async Task<ActionResult<object>> GetShare(string id)
    {
        var page = await _context.Pages.FindAsync(id);
        if (page == null) return NotFound();

        return Ok(new
        {
            pageId = id,
            linkSharingEnabled = page.LinkSharingEnabled,
            members = JsonSerializer.Deserialize<JsonElement>(page.ShareJson),
        });
    }

    [HttpPut("{id}/share")]
    public async Task<IActionResult> PutShare(string id, [FromBody] JsonElement body)
    {
        var page = await _context.Pages.FindAsync(id);
        if (page == null) return NotFound();

        if (body.TryGetProperty("linkSharingEnabled", out var link))
            page.LinkSharingEnabled = link.GetBoolean();
        if (body.TryGetProperty("members", out var members))
            page.ShareJson = members.GetRawText();

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id}/backlinks")]
    public async Task<ActionResult<object[]>> GetBacklinks(string id)
    {
        var pages = await _context.Pages.Where(p => p.DeletedAt == null).ToListAsync();
        var hits = new List<object>();

        foreach (var p in pages)
        {
            if (p.Id == id) continue;
            if (PageLinksTo(p, id))
            {
                hits.Add(new
                {
                    pageId = p.Id,
                    title = p.Title,
                    icon = p.Icon,
                    breadcrumb = p.Breadcrumb,
                });
            }
        }

        return Ok(hits.ToArray());
    }

    [HttpGet("{id}/history")]
    public async Task<ActionResult<object[]>> GetHistory(string id)
    {
        var versions = await _context.PageVersions
            .Where(v => v.PageId == id)
            .OrderByDescending(v => v.SavedAt)
            .Take(50)
            .ToListAsync();

        return Ok(versions.Select(v => new
        {
            v.Id,
            v.PageId,
            v.Title,
            savedAt = v.SavedAt,
            savedBy = v.SavedBy,
        }).ToArray());
    }

    [HttpGet("{id}/history/{versionId}")]
    public async Task<ActionResult<object>> GetHistoryVersion(string id, string versionId)
    {
        var v = await _context.PageVersions.FindAsync(versionId);
        if (v == null || v.PageId != id) return NotFound();

        return Ok(new
        {
            v.Id,
            v.PageId,
            v.Title,
            blocks = JsonSerializer.Deserialize<object>(v.BlocksJson),
            markdownBody = v.MarkdownBody,
            savedAt = v.SavedAt,
            savedBy = v.SavedBy,
        });
    }

    private async Task SaveVersionSnapshot(Page page)
    {
        _context.PageVersions.Add(new PageVersion
        {
            Id = Guid.NewGuid().ToString(),
            PageId = page.Id,
            Title = page.Title,
            BlocksJson = page.BlocksJson,
            MarkdownBody = page.MarkdownBody,
            SavedAt = page.UpdatedAt,
            SavedBy = page.UpdatedBy,
        });

        var old = await _context.PageVersions
            .Where(v => v.PageId == page.Id)
            .OrderByDescending(v => v.SavedAt)
            .Skip(50)
            .ToListAsync();
        if (old.Count > 0)
            _context.PageVersions.RemoveRange(old);
    }

    private static bool PageLinksTo(Page page, string targetId)
    {
        if (page.MarkdownBody?.Contains(targetId, StringComparison.Ordinal) == true)
            return true;

        try
        {
            var blocks = JsonSerializer.Deserialize<JsonElement>(page.BlocksJson);
            if (blocks.ValueKind != JsonValueKind.Array) return false;

            foreach (var block in blocks.EnumerateArray())
            {
                if (block.TryGetProperty("text", out var textEl))
                {
                    if (textEl.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var part in textEl.EnumerateArray())
                        {
                            if (part.TryGetProperty("l", out var link) && link.GetString() == targetId)
                                return true;
                        }
                    }
                }
            }
        }
        catch
        {
            /* ignore malformed blocks */
        }

        return false;
    }

    private static Page BuildPageFromJson(string id, JsonElement body)
    {
        var title = body.TryGetProperty("title", out var titleEl) ? titleEl.GetString() ?? id : id;
        var icon = body.TryGetProperty("icon", out var iconEl) ? iconEl.GetString() ?? "📄" : "📄";

        List<string> breadcrumb;
        if (body.TryGetProperty("breadcrumb", out var bcEl) && bcEl.ValueKind == JsonValueKind.Array)
            breadcrumb = JsonSerializer.Deserialize<List<string>>(bcEl.GetRawText()) ?? new List<string> { title };
        else
            breadcrumb = new List<string> { title };

        List<string> contributors;
        if (body.TryGetProperty("contributors", out var contrEl) && contrEl.ValueKind == JsonValueKind.Array)
            contributors = JsonSerializer.Deserialize<List<string>>(contrEl.GetRawText()) ?? new List<string>();
        else
            contributors = new List<string>();

        var workspaceId = body.TryGetProperty("workspaceId", out var wsEl) ? wsEl.GetString() ?? "acme" : "acme";
        var blocksJson = body.TryGetProperty("blocks", out var blocksEl) ? blocksEl.GetRawText() : "[]";

        string? markdownBody = null;
        if (body.TryGetProperty("markdownBody", out var mdEl) && mdEl.ValueKind != JsonValueKind.Null)
            markdownBody = mdEl.GetString();

        var updatedBy = body.TryGetProperty("updatedBy", out var ubEl) ? ubEl.GetString() : null;

        return new Page
        {
            Id = id,
            Title = title,
            Icon = icon,
            Breadcrumb = breadcrumb,
            Contributors = contributors,
            BlocksJson = blocksJson,
            MarkdownBody = markdownBody,
            WorkspaceId = workspaceId,
            ShareJson = "[]",
            LinkSharingEnabled = false,
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = updatedBy ?? "MC",
        };
    }

    private static object SerializePage(Page p) => new
    {
        p.Id,
        p.Title,
        p.Icon,
        Breadcrumb = p.Breadcrumb,
        Contributors = p.Contributors,
        Blocks = JsonSerializer.Deserialize<object>(p.BlocksJson),
        MarkdownBody = p.MarkdownBody,
        UpdatedAt = p.UpdatedAt,
        UpdatedBy = p.UpdatedBy,
        WorkspaceId = p.WorkspaceId,
        LinkSharingEnabled = p.LinkSharingEnabled,
        DeletedAt = p.DeletedAt,
    };
}
