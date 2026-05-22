using Lumen.API.Data;
using Lumen.API.Models;
using Lumen.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Lumen.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly NotificationService _notifications;

    public CommentsController(AppDbContext context, NotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    [HttpGet]
    public async Task<ActionResult<Dictionary<string, List<Comment>>>> GetAllComments()
    {
        var comments = await _context.Comments
            .Where(c => c.ParentCommentId == null)
            .ToListAsync();

        foreach (var c in comments)
            c.EnsureJsonDefaults();

        var grouped = comments.GroupBy(c => c.BlockIdx.HasValue
                ? $"{c.PageId}__{c.BlockIdx}"
                : c.PageId)
            .ToDictionary(g => g.Key, g => g.ToList());

        return Ok(grouped);
    }

    [HttpPost]
    public async Task<ActionResult<Comment>> CreateComment([FromBody] Comment comment)
    {
        comment.Id = Guid.NewGuid().ToString();
        comment.EnsureJsonDefaults();
        _context.Comments.Add(comment);
        await _context.SaveChangesAsync();

        var page = await _context.Pages.FindAsync(comment.PageId);
        var pageTitle = page?.Title ?? comment.PageId ?? "a page";
        var snippet = comment.Text.Length > 80 ? comment.Text[..80] + "…" : comment.Text;
        var verb = comment.BlockIdx.HasValue ? "commented on" : "commented on";

        await _notifications.NotifyPageContributorsAsync(
            comment.PageId ?? "",
            comment.Author,
            verb,
            snippet,
            comment.Author);

        return CreatedAtAction(nameof(GetComment), new { id = comment.Id }, comment);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Comment>> GetComment(string id)
    {
        var comment = await _context.Comments.FindAsync(id);
        if (comment == null) return NotFound();
        return Ok(comment);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateComment(string id, [FromBody] Comment comment)
    {
        if (id != comment.Id) return BadRequest();

        comment.EnsureJsonDefaults();
        _context.Entry(comment).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteComment(string id)
    {
        var comment = await _context.Comments.FindAsync(id);
        if (comment == null) return NotFound();

        _context.Comments.Remove(comment);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
