using Microsoft.AspNetCore.Identity;

namespace Lumen.API.Models;

public class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = "";
    public string Initial { get; set; } = "";
    public string Color { get; set; } = "#888888";
}
