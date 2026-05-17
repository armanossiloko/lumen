using LumenApi.Data;
using LumenApi.Hubs;
using LumenApi.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var dbPath = Path.Combine(builder.Environment.ContentRootPath, "lumen.db");
var connectionString = $"Data Source={dbPath}";

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
builder.Services.AddSignalR();

builder.Services.AddSingleton<PresenceService>();
builder.Services.AddScoped<NotificationService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.MapHub<LumenHub>("/hubs/lumen");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    DatabaseRepair.Apply(db);
    DataSeeder.SeedData(db);
    DataSeeder.SyncAuthRfcBlocksFromFile(db);
    DataSeeder.EnsureNavigationTreeIfEmpty(db);
    DataSeeder.SyncNavigationTreeFromFile(db);
}

app.Run();
