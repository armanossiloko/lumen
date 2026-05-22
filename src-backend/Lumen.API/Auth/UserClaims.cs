using System.Security.Claims;

namespace Lumen.API.Auth;

public static class UserClaims
{
    public const string UserId = "lumen:userId";

    public static string? GetUserId(this ClaimsPrincipal? principal) =>
        principal?.FindFirstValue(UserId);
}
