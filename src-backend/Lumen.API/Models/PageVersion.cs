namespace Lumen.API.Models;

public class PageVersion
{
    public string Id { get; set; } = string.Empty;
    public string PageId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string BlocksJson { get; set; } = "[]";
    public string? MarkdownBody { get; set; }
    public DateTime SavedAt { get; set; } = DateTime.UtcNow;
    public string? SavedBy { get; set; }
}
