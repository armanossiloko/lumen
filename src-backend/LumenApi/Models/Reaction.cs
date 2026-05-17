namespace LumenApi.Models;

public class Reaction
{
    public int Id { get; set; }
    public string PageId { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
