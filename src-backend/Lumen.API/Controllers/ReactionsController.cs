using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Lumen.API.Data;
using Lumen.API.Models;

namespace Lumen.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReactionsController : ControllerBase
{
    private readonly AppDbContext _context;
    
    public ReactionsController(AppDbContext context)
    {
        _context = context;
    }
    
    [HttpGet]
    public async Task<ActionResult<Dictionary<string, Dictionary<string, List<string>>>>> GetAllReactions()
    {
        var reactions = await _context.Reactions.ToListAsync();
        
        var grouped = reactions
            .GroupBy(r => r.PageId)
            .ToDictionary(
                g => g.Key,
                g => g.GroupBy(r => r.Emoji)
                    .ToDictionary(
                        eg => eg.Key,
                        eg => eg.Select(r => r.UserId).ToList()
                    )
            );
        
        return Ok(grouped);
    }
    
    [HttpPost]
    public async Task<ActionResult<Reaction>> AddReaction([FromBody] Reaction reaction)
    {
        var existing = await _context.Reactions
            .FirstOrDefaultAsync(r => r.PageId == reaction.PageId 
                && r.Emoji == reaction.Emoji 
                && r.UserId == reaction.UserId);
        
        if (existing != null)
        {
            _context.Reactions.Remove(existing);
        }
        else
        {
            _context.Reactions.Add(reaction);
        }
        
        await _context.SaveChangesAsync();
        return Ok(reaction);
    }
}
