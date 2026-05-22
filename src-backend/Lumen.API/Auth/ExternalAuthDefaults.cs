namespace Lumen.API.Auth;

public static class ExternalAuthDefaults
{
    public const string Microsoft = "Microsoft";
    public const string Facebook = "Facebook";
    public const string GitHub = "GitHub";
    public const string Twitter = "Twitter";
    public const string Keycloak = "Keycloak";

    public static readonly string[] All =
        [Microsoft, Facebook, GitHub, Twitter, Keycloak];
}
