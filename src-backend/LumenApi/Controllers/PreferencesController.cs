using LumenApi.Data;
using LumenApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace LumenApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PreferencesController : ControllerBase
{
    private readonly AppDbContext _context;

    public PreferencesController(AppDbContext context) => _context = context;

    [HttpGet("{userId}")]
    public async Task<ActionResult<object>> Get(string userId)
    {
        var pref = await _context.UserPreferences.FindAsync(userId);
        if (pref == null)
        {
            return Ok(new { userId, theme = "dark", accent = "#ec4899", currentWorkspaceId = "acme" });
        }

        return Ok(new
        {
            userId = pref.UserId,
            theme = pref.Theme,
            accent = pref.Accent,
            currentWorkspaceId = pref.CurrentWorkspaceId,
        });
    }

    [HttpPut("{userId}")]
    public async Task<IActionResult> Put(string userId, [FromBody] JsonElement body)
    {
        var pref = await _context.UserPreferences.FindAsync(userId);
        if (pref == null)
        {
            pref = new UserPreference { UserId = userId };
            _context.UserPreferences.Add(pref);
        }

        if (body.TryGetProperty("theme", out var theme))
            pref.Theme = theme.GetString() ?? pref.Theme;
        if (body.TryGetProperty("accent", out var accent))
            pref.Accent = accent.GetString() ?? pref.Accent;
        if (body.TryGetProperty("currentWorkspaceId", out var ws))
            pref.CurrentWorkspaceId = ws.GetString() ?? pref.CurrentWorkspaceId;

        await _context.SaveChangesAsync();
        return NoContent();
    }
}
