using Lumen.API.Data;
using Lumen.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Lumen.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FavoritesController : ControllerBase
{
    private readonly AppDbContext _context;

    public FavoritesController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<string[]>> GetFavorites([FromQuery] string userId = "MC")
    {
        var ids = await _context.UserFavorites
            .Where(f => f.UserId == userId)
            .Select(f => f.PageId)
            .ToListAsync();
        return Ok(ids);
    }

    [HttpPost("{pageId}")]
    public async Task<IActionResult> AddFavorite(string pageId, [FromQuery] string userId = "MC")
    {
        if (await _context.Pages.FindAsync(pageId) == null)
            return NotFound();

        if (!await _context.UserFavorites.AnyAsync(f => f.UserId == userId && f.PageId == pageId))
        {
            _context.UserFavorites.Add(new UserFavorite { UserId = userId, PageId = pageId });
            await _context.SaveChangesAsync();
        }

        return NoContent();
    }

    [HttpDelete("{pageId}")]
    public async Task<IActionResult> RemoveFavorite(string pageId, [FromQuery] string userId = "MC")
    {
        var fav = await _context.UserFavorites
            .FirstOrDefaultAsync(f => f.UserId == userId && f.PageId == pageId);
        if (fav == null) return NotFound();

        _context.UserFavorites.Remove(fav);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
