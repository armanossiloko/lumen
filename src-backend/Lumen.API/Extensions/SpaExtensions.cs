namespace Lumen.API.Extensions;

public static class SpaExtensions
{
    /// <summary>Serves Angular static files from wwwroot when present (monolith Docker image).</summary>
    public static WebApplication UseLumenSpa(this WebApplication app)
    {
        var wwwroot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
        if (!Directory.Exists(wwwroot))
            return app;

        app.UseDefaultFiles();
        app.UseStaticFiles();
        app.MapFallbackToFile("index.html");
        return app;
    }
}
