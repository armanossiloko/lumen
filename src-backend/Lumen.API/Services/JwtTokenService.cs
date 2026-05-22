using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Lumen.API.Auth;
using Lumen.API.Models;
using Microsoft.IdentityModel.Tokens;

namespace Lumen.API.Services;

public class JwtTokenService
{
    private readonly string _issuer;
    private readonly string _audience;
    private readonly SymmetricSecurityKey _key;
    private readonly int _expireDays;

    public JwtTokenService(IConfiguration configuration)
    {
        var secret = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is required in configuration.");
        _issuer = configuration["Jwt:Issuer"] ?? "Lumen.API";
        _audience = configuration["Jwt:Audience"] ?? "Lumen.App";
        _expireDays = int.TryParse(configuration["Jwt:ExpireDays"], out var d) ? d : 14;
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    }

    public string CreateToken(ApplicationUser user, bool rememberMe)
    {
        var days = rememberMe ? _expireDays : 1;
        var claims = new[]
        {
            new Claim(UserClaims.UserId, user.Id),
            new Claim(ClaimTypes.Name, user.DisplayName),
        };

        var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(days),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
