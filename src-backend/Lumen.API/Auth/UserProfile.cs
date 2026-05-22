using Lumen.API.Models;

namespace Lumen.API.Auth;

public static class UserProfile
{
    public static object ToApi(ApplicationUser user) => new
    {
        userId = user.Id,
        name = user.DisplayName,
        initial = user.Initial,
        color = user.Color,
    };
}
