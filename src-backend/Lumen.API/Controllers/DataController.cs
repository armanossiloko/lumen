using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using Lumen.API.Data;
using Lumen.API.Models;

using System.Text.Json;



namespace Lumen.API.Controllers;



[ApiController]

[Route("api/[controller]")]

public class DataController : ControllerBase

{

    private readonly AppDbContext _context;



    public DataController(AppDbContext context)

    {

        _context = context;

    }



    [HttpGet("tree")]
    public async Task<ActionResult> GetTree([FromQuery] string workspaceId = "acme")
    {
        var ws = await _context.Workspaces.FirstOrDefaultAsync(w => w.Id == workspaceId);
        var json = ws?.NavigationTreeJson;

        if (string.IsNullOrWhiteSpace(json))
        {
            if (workspaceId == "acme")
                json = ReadDefaultNavigationTreeFile();
            else
                return Ok(JsonSerializer.Deserialize<JsonElement>("[]"));
        }

        try
        {
            var el = JsonSerializer.Deserialize<JsonElement>(json);
            if (NavigationTreeNeedsRepair(el))
            {
                var canonical = ReadDefaultNavigationTreeFile();
                if (!string.IsNullOrWhiteSpace(canonical) && ws != null)
                {
                    ws.NavigationTreeJson = canonical;
                    await _context.SaveChangesAsync();
                    el = JsonSerializer.Deserialize<JsonElement>(canonical)!;
                }
            }
            return Ok(el);
        }
        catch
        {
            return Ok(JsonSerializer.Deserialize<JsonElement>(ReadDefaultNavigationTreeFile() ?? "[]"));
        }
    }

    /// <summary>Engineering saved as a root folder breaks sidebar navigation (toggle-only section header).</summary>
    private static bool NavigationTreeNeedsRepair(JsonElement tree)
    {
        if (tree.ValueKind != JsonValueKind.Array) return true;
        foreach (var node in tree.EnumerateArray())
        {
            if (node.TryGetProperty("id", out var idProp)
                && idProp.GetString() == "engineering"
                && node.TryGetProperty("kind", out var kindProp)
                && kindProp.GetString() == "folder")
            {
                return true;
            }
        }
        return false;
    }



    [HttpPut("tree")]
    public async Task<IActionResult> PutTree(
        [FromBody] JsonElement tree,
        [FromQuery] string workspaceId = "acme")
    {
        var ws = await _context.Workspaces.FirstOrDefaultAsync(w => w.Id == workspaceId);

        if (ws == null)

            return NotFound(new { error = "Default workspace not found" });



        ws.NavigationTreeJson = tree.GetRawText();

        await _context.SaveChangesAsync();

        return NoContent();

    }



    private static string? ReadDefaultNavigationTreeFile()

    {

        var path = Path.Combine(AppContext.BaseDirectory, "SeedData", "navigation-tree.json");

        return System.IO.File.Exists(path) ? System.IO.File.ReadAllText(path) : null;

    }



    [HttpGet("people")]

    public async Task<ActionResult> GetPeople()

    {

        var users = await _context.Users.ToListAsync();

        return Ok(users.ToDictionary(u => u.Id, u => new { name = u.DisplayName, u.Color, u.Initial }));

    }



    [HttpGet("workspaces")]

    public async Task<ActionResult> GetWorkspaces()

    {

        var workspaces = await _context.Workspaces.ToListAsync();

        return Ok(workspaces);

    }

    [HttpGet("storage")]
    public async Task<ActionResult<object>> GetStorage([FromQuery] string userId = "MC")
    {
        var pageBytes = await _context.Pages
            .Where(p => p.DeletedAt == null)
            .SumAsync(p => (long)(p.BlocksJson.Length + (p.MarkdownBody != null ? p.MarkdownBody.Length : 0)));

        const long quotaBytes = 10L * 1024 * 1024 * 1024;
        var usedBytes = Math.Min(pageBytes + 50_000_000, quotaBytes - 1);

        return Ok(new
        {
            userId,
            usedBytes,
            quotaBytes,
            usedLabel = FormatBytes(usedBytes),
            quotaLabel = "10 GB",
        });
    }

    private static string FormatBytes(long bytes)
    {
        if (bytes >= 1_000_000_000) return $"{bytes / 1_000_000_000.0:0.#} GB";
        if (bytes >= 1_000_000) return $"{bytes / 1_000_000.0:0.#} MB";
        return $"{bytes / 1_000.0:0.#} KB";
    }

    [HttpPost("workspaces")]
    public async Task<ActionResult<Workspace>> CreateWorkspace([FromBody] JsonElement body)
    {
        var id = body.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
        var name = body.TryGetProperty("name", out var nameEl) ? nameEl.GetString() : null;
        if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(name))
            return BadRequest(new { error = "id and name are required" });

        if (await _context.Workspaces.AnyAsync(w => w.Id == id))
            return Conflict(new { error = "Workspace already exists" });

        var initial = name.Trim()[0].ToString().ToUpperInvariant();
        var ws = new Workspace
        {
            Id = id,
            Name = name.Trim(),
            Initial = initial,
            Color = "#6366f1",
            Members = 1,
            NavigationTreeJson = "[]",
        };
        _context.Workspaces.Add(ws);
        await _context.SaveChangesAsync();
        return Ok(ws);
    }

}

