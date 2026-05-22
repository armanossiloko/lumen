using System.ComponentModel.DataAnnotations.Schema;

namespace Lumen.API.Models;

public class UserPreference
{
    public string UserId { get; set; } = string.Empty;
    public string Theme { get; set; } = "dark";
    public string Accent { get; set; } = "#ec4899";
    public string CurrentWorkspaceId { get; set; } = "acme";
    public string PageWidth { get; set; } = "wide";

    [Column(TypeName = "TEXT")]
    public string RecentPagesJson { get; set; } = "[]";
}
