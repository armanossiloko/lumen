using System.ComponentModel.DataAnnotations.Schema;

namespace LumenApi.Models;

public class Comment
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Author { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string At { get; set; } = string.Empty;
    public bool Resolved { get; set; } = false;

    public string PageId { get; set; } = string.Empty;
    public int? BlockIdx { get; set; }

    [Column(TypeName = "TEXT")]
    public string? RepliesJson { get; set; }

    [Column(TypeName = "TEXT")]
    public string? ReactionsJson { get; set; }

    public string? ParentCommentId { get; set; }

    public void EnsureJsonDefaults()
    {
        RepliesJson ??= "[]";
        ReactionsJson ??= "{}";
    }
}
