using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using LumenApi.Data;

using System.Text.Json;



namespace LumenApi.Controllers;



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
            json = ReadDefaultNavigationTreeFile();

        if (string.IsNullOrWhiteSpace(json))
            return Ok(JsonSerializer.Deserialize<JsonElement>("[]"));

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

        return Ok(users.ToDictionary(u => u.Id, u => new { u.Name, u.Color, u.Initial }));

    }



    [HttpGet("workspaces")]

    public async Task<ActionResult> GetWorkspaces()

    {

        var workspaces = await _context.Workspaces.ToListAsync();

        return Ok(workspaces);

    }

}

