using Lumen.API.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;

namespace Lumen.API.Extensions;

public static class AuthenticationExtensions
{
    public static AuthenticationBuilder AddLumenExternalLogins(
        this AuthenticationBuilder auth,
        IConfiguration configuration,
        string externalSignInScheme)
    {
        var section = configuration.GetSection("Authentication");

        var microsoft = section.GetSection("Microsoft");
        if (!string.IsNullOrWhiteSpace(microsoft["ClientId"]))
        {
            auth.AddMicrosoftAccount(options =>
            {
                options.SignInScheme = externalSignInScheme;
                options.ClientId = microsoft["ClientId"]!;
                options.ClientSecret = microsoft["ClientSecret"] ?? "";
                options.CallbackPath = "/signin-microsoft";
            });
        }

        var facebook = section.GetSection("Facebook");
        if (!string.IsNullOrWhiteSpace(facebook["ClientId"]))
        {
            auth.AddFacebook(options =>
            {
                options.SignInScheme = externalSignInScheme;
                options.ClientId = facebook["ClientId"]!;
                options.AppSecret = facebook["ClientSecret"] ?? "";
                options.CallbackPath = "/signin-facebook";
            });
        }

        var github = section.GetSection("GitHub");
        if (!string.IsNullOrWhiteSpace(github["ClientId"]))
        {
            auth.AddGitHub(options =>
            {
                options.SignInScheme = externalSignInScheme;
                options.ClientId = github["ClientId"]!;
                options.ClientSecret = github["ClientSecret"] ?? "";
                options.CallbackPath = "/signin-github";
                options.Scope.Add("user:email");
            });
        }

        var twitter = section.GetSection("Twitter");
        if (!string.IsNullOrWhiteSpace(twitter["ClientId"]))
        {
            auth.AddTwitter(options =>
            {
                options.SignInScheme = externalSignInScheme;
                options.ConsumerKey = twitter["ClientId"]!;
                options.ConsumerSecret = twitter["ClientSecret"] ?? "";
                options.CallbackPath = "/signin-twitter";
                options.RetrieveUserDetails = true;
            });
        }

        var keycloak = section.GetSection("Keycloak");
        if (!string.IsNullOrWhiteSpace(keycloak["Authority"]) &&
            !string.IsNullOrWhiteSpace(keycloak["ClientId"]))
        {
            auth.AddOpenIdConnect(ExternalAuthDefaults.Keycloak, options =>
            {
                options.SignInScheme = externalSignInScheme;
                var authority = keycloak["Authority"]!.TrimEnd('/');
                options.Authority = authority;
                options.RequireHttpsMetadata = authority.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
                options.ClientId = keycloak["ClientId"]!;
                options.ClientSecret = keycloak["ClientSecret"] ?? "";
                options.CallbackPath = "/signin-keycloak";
                options.ResponseType = "code";
                options.SaveTokens = true;
                options.GetClaimsFromUserInfoEndpoint = true;
                options.Scope.Clear();
                options.Scope.Add("openid");
                options.Scope.Add("profile");
                options.Scope.Add("email");
            });
        }

        return auth;
    }

    public static IReadOnlyList<string> GetEnabledExternalProviders(IConfiguration configuration)
    {
        var section = configuration.GetSection("Authentication");
        var list = new List<string>();

        if (!string.IsNullOrWhiteSpace(section["Microsoft:ClientId"]))
            list.Add(ExternalAuthDefaults.Microsoft);
        if (!string.IsNullOrWhiteSpace(section["Facebook:ClientId"]))
            list.Add(ExternalAuthDefaults.Facebook);
        if (!string.IsNullOrWhiteSpace(section["GitHub:ClientId"]))
            list.Add(ExternalAuthDefaults.GitHub);
        if (!string.IsNullOrWhiteSpace(section["Twitter:ClientId"]))
            list.Add(ExternalAuthDefaults.Twitter);
        if (!string.IsNullOrWhiteSpace(section["Keycloak:Authority"]) &&
            !string.IsNullOrWhiteSpace(section["Keycloak:ClientId"]))
            list.Add(ExternalAuthDefaults.Keycloak);

        return list;
    }
}
