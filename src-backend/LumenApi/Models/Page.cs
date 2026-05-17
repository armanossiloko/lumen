using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace LumenApi.Models;

public class Page
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    
    [Column(TypeName = "TEXT")]
    public string BreadcrumbJson { get; set; } = "[]";
    
    [NotMapped]
    public List<string> Breadcrumb
    {
        get => JsonSerializer.Deserialize<List<string>>(BreadcrumbJson) ?? new();
        set => BreadcrumbJson = JsonSerializer.Serialize(value);
    }
    
    [Column(TypeName = "TEXT")]
    public string ContributorsJson { get; set; } = "[]";
    
    [NotMapped]
    public List<string> Contributors
    {
        get => JsonSerializer.Deserialize<List<string>>(ContributorsJson) ?? new();
        set => ContributorsJson = JsonSerializer.Serialize(value);
    }
    
    [Column(TypeName = "TEXT")]
    public string BlocksJson { get; set; } = "[]";

    /// <summary>Optional Markdown document body (GFM). When set, clients render this instead of blocks.</summary>
    [Column(TypeName = "TEXT")]
    public string? MarkdownBody { get; set; }
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? UpdatedBy { get; set; }
    
    public string WorkspaceId { get; set; } = string.Empty;

    [Column(TypeName = "TEXT")]
    public string ShareJson { get; set; } = "[]";

    public bool LinkSharingEnabled { get; set; }

    public DateTime? DeletedAt { get; set; }
}
