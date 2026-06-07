using System.Security.Claims;
using Lumen.API.Auth;
using Lumen.API.Data;
using Lumen.API.Extensions;
using Lumen.API.Models;
using Lumen.API.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authentication.MicrosoftAccount;
using Microsoft.AspNetCore.Authentication.Twitter;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using AspNet.Security.OAuth.GitHub;

namespace Lumen.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtTokenService _jwt;
    private readonly ExternalAuthService _externalAuth;
    private readonly IConfiguration _configuration;

    public AuthController(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        JwtTokenService jwt,
        ExternalAuthService externalAuth,
        IConfiguration configuration)
    {
        _context = context;
        _userManager = userManager;
        _jwt = jwt;
        _externalAuth = externalAuth;
        _configuration = configuration;
    }

    /// <summary>Enabled external providers and API reachability probe.</summary>
    [AllowAnonymous]
    [HttpGet("providers")]
    public ActionResult<object> GetProviders()
    {
        return Ok(new
        {
            providers = AuthenticationExtensions.GetEnabledExternalProviders(_configuration),
        });
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<object>> Login([FromBody] LoginRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.UserName) || string.IsNullOrWhiteSpace(body.Password))
            return BadRequest(new { error = "Username or email and password are required." });

        var login = body.UserName.Trim();
        var user = await _userManager.FindByNameAsync(login)
            ?? await _userManager.FindByEmailAsync(login);

        if (user == null || !await _userManager.CheckPasswordAsync(user, body.Password))
            return Unauthorized(new { error = "Invalid user or password." });

        var token = _jwt.CreateToken(user, body.RememberMe);
        return Ok(SessionPayload(user, token));
    }

    [AllowAnonymous]
    [HttpGet("external/{provider}")]
    public IActionResult ExternalLogin(string provider, [FromQuery] string? returnUrl)
    {
        if (!TryMapProviderScheme(provider, out var scheme))
            return BadRequest(new { error = "Unknown sign-in provider." });

        var enabled = AuthenticationExtensions.GetEnabledExternalProviders(_configuration);
        if (!enabled.Contains(MapProviderId(provider), StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { error = "That sign-in provider is not configured." });

        var callbackUrl = Url.Action(nameof(ExternalCallback), values: new { returnUrl })!;
        var props = new AuthenticationProperties { RedirectUri = callbackUrl };
        if (!string.IsNullOrWhiteSpace(returnUrl))
            props.Items["returnUrl"] = returnUrl;

        return Challenge(props, scheme);
    }

    [AllowAnonymous]
    [HttpGet("external-callback")]
    public async Task<IActionResult> ExternalCallback([FromQuery] string? returnUrl)
    {
        var frontend = _configuration["Authentication:FrontendCallbackUrl"]
            ?? "http://localhost:6000/auth/callback";

        var result = await HttpContext.AuthenticateAsync(AuthSchemes.ExternalCookie);
        if (!result.Succeeded)
            return Redirect(FrontendError(frontend, "External sign-in failed."));

        try
        {
            var provider = result.Ticket?.AuthenticationScheme ?? "External";

            var user = await _externalAuth.FindOrCreateUserAsync(result.Principal, provider);
            var token = _jwt.CreateToken(user, rememberMe: true);
            await HttpContext.SignOutAsync(AuthSchemes.ExternalCookie);

            var q = new Dictionary<string, string?>
            {
                ["token"] = token,
                ["userId"] = user.Id,
                ["name"] = user.DisplayName,
                ["initial"] = user.Initial,
                ["color"] = user.Color,
            };
            if (!string.IsNullOrWhiteSpace(returnUrl))
                q["returnUrl"] = returnUrl;

            return Redirect(FrontendSuccess(frontend, q));
        }
        catch (Exception)
        {
            await HttpContext.SignOutAsync(AuthSchemes.ExternalCookie);
            return Redirect(FrontendError(frontend, "Could not complete external sign-in."));
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<object>> GetMe()
    {
        var userId = User.GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
            return Unauthorized();

        return Ok(UserProfile.ToApi(user));
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout() => Ok(new { ok = true });

    private static object SessionPayload(ApplicationUser user, string token) => new
    {
        userId = user.Id,
        name = user.DisplayName,
        initial = user.Initial,
        color = user.Color,
        token,
    };

    private static string FrontendSuccess(string baseUrl, Dictionary<string, string?> query)
    {
        var qs = string.Join("&", query
            .Where(kv => !string.IsNullOrEmpty(kv.Value))
            .Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value!)}"));
        return $"{baseUrl}?{qs}";
    }

    private static string FrontendError(string baseUrl, string message) =>
        $"{baseUrl}?error={Uri.EscapeDataString(message)}";

    private static bool TryMapProviderScheme(string provider, out string scheme)
    {
        scheme = provider.Trim().ToLowerInvariant() switch
        {
            "microsoft" => MicrosoftAccountDefaults.AuthenticationScheme,
            "facebook" => FacebookDefaults.AuthenticationScheme,
            "github" => GitHubAuthenticationDefaults.AuthenticationScheme,
            "twitter" => TwitterDefaults.AuthenticationScheme,
            "keycloak" => ExternalAuthDefaults.Keycloak,
            _ => "",
        };
        return scheme.Length > 0;
    }

    private static string MapProviderId(string provider) => provider.Trim().ToLowerInvariant() switch
    {
        "microsoft" => ExternalAuthDefaults.Microsoft,
        "facebook" => ExternalAuthDefaults.Facebook,
        "github" => ExternalAuthDefaults.GitHub,
        "twitter" => ExternalAuthDefaults.Twitter,
        "keycloak" => ExternalAuthDefaults.Keycloak,
        _ => provider,
    };

    public sealed class LoginRequest
    {
        public string UserName { get; set; } = "";
        public string Password { get; set; } = "";
        public bool RememberMe { get; set; }
    }
}
