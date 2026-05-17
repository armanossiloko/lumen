namespace LumenApi.Models;

public class InboxItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Author { get; set; } = string.Empty;
    public string Verb { get; set; } = string.Empty;
    public string PageId { get; set; } = string.Empty;
    public string PageTitle { get; set; } = string.Empty;
    public string Snippet { get; set; } = string.Empty;
    public string At { get; set; } = string.Empty;
    public bool Unread { get; set; } = true;
    public string UserId { get; set; } = string.Empty;
}
