using System.ComponentModel.DataAnnotations.Schema;

namespace LumenApi.Models;

public class Workspace
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Initial { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int Members { get; set; }

    [Column(TypeName = "TEXT")]
    public string? NavigationTreeJson { get; set; }
}
