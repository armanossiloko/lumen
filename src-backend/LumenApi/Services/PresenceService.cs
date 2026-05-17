using System.Collections.Concurrent;

namespace LumenApi.Services;

public class PresenceService
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, DateTime>> _pageViewers = new();

    public void Join(string pageId, string userId)
    {
        var viewers = _pageViewers.GetOrAdd(pageId, _ => new ConcurrentDictionary<string, DateTime>());
        viewers[userId] = DateTime.UtcNow;
    }

    public void Leave(string pageId, string userId)
    {
        if (_pageViewers.TryGetValue(pageId, out var viewers))
        {
            viewers.TryRemove(userId, out _);
            if (viewers.IsEmpty)
                _pageViewers.TryRemove(pageId, out _);
        }
    }

    /// <summary>Remove user from every page; returns page ids that changed.</summary>
    public IReadOnlyList<string> LeaveAll(string userId)
    {
        var affected = new List<string>();
        foreach (var pageId in _pageViewers.Keys.ToList())
        {
            if (_pageViewers.TryGetValue(pageId, out var viewers) && viewers.ContainsKey(userId))
            {
                Leave(pageId, userId);
                affected.Add(pageId);
            }
        }
        return affected;
    }

    public void Touch(string pageId, string userId)
    {
        if (_pageViewers.TryGetValue(pageId, out var viewers) && viewers.ContainsKey(userId))
            viewers[userId] = DateTime.UtcNow;
    }

    public string[] GetViewers(string pageId)
    {
        if (!_pageViewers.TryGetValue(pageId, out var viewers))
            return Array.Empty<string>();

        var cutoff = DateTime.UtcNow.AddMinutes(-2);
        return viewers
            .Where(kv => kv.Value >= cutoff)
            .Select(kv => kv.Key)
            .OrderBy(id => id)
            .ToArray();
    }
}
