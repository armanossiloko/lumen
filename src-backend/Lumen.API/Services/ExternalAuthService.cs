using System.Security.Claims;
using Lumen.API.Models;
using Microsoft.AspNetCore.Identity;

namespace Lumen.API.Services;

public class ExternalAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;

    public ExternalAuthService(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<ApplicationUser> FindOrCreateUserAsync(ClaimsPrincipal principal, string loginProvider)
    {
        var providerKey = principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? principal.FindFirstValue("sub")
            ?? throw new InvalidOperationException("External login did not return a user id.");

        var existing = await _userManager.FindByLoginAsync(loginProvider, providerKey);
        if (existing != null)
            return existing;

        var email = principal.FindFirstValue(ClaimTypes.Email)
            ?? principal.FindFirstValue("email");

        if (!string.IsNullOrWhiteSpace(email))
        {
            var byEmail = await _userManager.FindByEmailAsync(email);
            if (byEmail != null)
            {
                await _userManager.AddLoginAsync(byEmail, new UserLoginInfo(loginProvider, providerKey, loginProvider));
                return byEmail;
            }
        }

        var displayName = principal.FindFirstValue(ClaimTypes.Name)
            ?? principal.FindFirstValue("name")
            ?? email
            ?? "User";

        var userName = !string.IsNullOrWhiteSpace(email)
            ? email
            : $"{loginProvider.ToLowerInvariant()}_{providerKey}";

        var user = new ApplicationUser
        {
            UserName = userName,
            Email = email,
            EmailConfirmed = !string.IsNullOrWhiteSpace(email),
            DisplayName = displayName,
            Initial = displayName.Trim().Length > 0
                ? displayName.Trim()[..1].ToUpperInvariant()
                : "?",
            Color = ColorFromKey(providerKey),
        };

        var create = await _userManager.CreateAsync(user);
        if (!create.Succeeded)
            throw new InvalidOperationException(
                string.Join("; ", create.Errors.Select(e => e.Description)));

        await _userManager.AddLoginAsync(user, new UserLoginInfo(loginProvider, providerKey, loginProvider));
        return user;
    }

    private static string ColorFromKey(string key)
    {
        var palette = new[] { "#ec4899", "#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4" };
        var hash = Math.Abs(key.GetHashCode(StringComparison.Ordinal));
        return palette[hash % palette.Length];
    }
}
