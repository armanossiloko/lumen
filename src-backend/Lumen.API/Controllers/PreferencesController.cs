using Lumen.API.Data;
using Lumen.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Lumen.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PreferencesController : ControllerBase
{
    private readonly AppDbContext _context;

    public PreferencesController(AppDbContext context) => _context = context;

    [HttpGet("{userId}")]
    public async Task<ActionResult<object>> Get(string userId)
    {
        var pref = await EnsurePreferences(userId);
        return Ok(Serialize(pref));
    }

    [HttpPut("{userId}")]
    public async Task<IActionResult> Put(string userId, [FromBody] JsonElement body)
    {
        var pref = await EnsurePreferences(userId);

        if (body.TryGetProperty("theme", out var theme))
            pref.Theme = theme.GetString() ?? pref.Theme;
        if (body.TryGetProperty("accent", out var accent))
            pref.Accent = accent.GetString() ?? pref.Accent;
        if (body.TryGetProperty("currentWorkspaceId", out var ws))
            pref.CurrentWorkspaceId = ws.GetString() ?? pref.CurrentWorkspaceId;
        if (body.TryGetProperty("pageWidth", out var pw))
            pref.PageWidth = pw.GetString() ?? pref.PageWidth;
        if (body.TryGetProperty("recentPages", out var recent) && recent.ValueKind == JsonValueKind.Array)
            pref.RecentPagesJson = recent.GetRawText();

        await _context.SaveChangesAsync();
        return NoContent();
    }

    private async Task<UserPreference> EnsurePreferences(string userId)
    {
        var pref = await _context.UserPreferences.FindAsync(userId);
        if (pref != null) return pref;

        pref = new UserPreference { UserId = userId };
        _context.UserPreferences.Add(pref);
        await _context.SaveChangesAsync();
        return pref;
    }

    private static object Serialize(UserPreference pref)
    {
        List<string> recent;
        try
        {
            recent = JsonSerializer.Deserialize<List<string>>(pref.RecentPagesJson) ?? [];
        }
        catch
        {
            recent = [];
        }

        return new
        {
            userId = pref.UserId,
            theme = pref.Theme,
            accent = pref.Accent,
            currentWorkspaceId = pref.CurrentWorkspaceId,
            pageWidth = pref.PageWidth,
            recentPages = recent,
        };
    }
}
