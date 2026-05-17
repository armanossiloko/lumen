namespace LumenApi.Models;

public class UserPreference
{
    public string UserId { get; set; } = string.Empty;
    public string Theme { get; set; } = "dark";
    public string Accent { get; set; } = "#ec4899";
    public string CurrentWorkspaceId { get; set; } = "acme";
}
