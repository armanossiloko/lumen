using Microsoft.EntityFrameworkCore;
using LumenApi.Models;

namespace LumenApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Page> Pages { get; set; }
    public DbSet<Comment> Comments { get; set; }
    public DbSet<Reaction> Reactions { get; set; }
    public DbSet<Workspace> Workspaces { get; set; }
    public DbSet<InboxItem> InboxItems { get; set; }
    public DbSet<PageVersion> PageVersions { get; set; }
    public DbSet<UserFavorite> UserFavorites { get; set; }
    public DbSet<UserPreference> UserPreferences { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Page>().HasKey(p => p.Id);
        modelBuilder.Entity<User>().HasKey(u => u.Id);
        modelBuilder.Entity<Comment>().HasKey(c => c.Id);
        modelBuilder.Entity<Reaction>().HasKey(r => r.Id);
        modelBuilder.Entity<Workspace>().HasKey(w => w.Id);
        modelBuilder.Entity<InboxItem>().HasKey(i => i.Id);
        modelBuilder.Entity<PageVersion>().HasKey(v => v.Id);
        modelBuilder.Entity<UserFavorite>().HasKey(f => new { f.UserId, f.PageId });
        modelBuilder.Entity<UserPreference>().HasKey(p => p.UserId);

        // Columns added via ALTER TABLE may be NULL on existing rows — must be optional in the model.
        modelBuilder.Entity<Comment>(entity =>
        {
            entity.Property(c => c.ReactionsJson).HasColumnType("TEXT").IsRequired(false);
            entity.Property(c => c.RepliesJson).HasColumnType("TEXT").IsRequired(false);
        });

        modelBuilder.Entity<Page>(entity =>
        {
            entity.Property(p => p.MarkdownBody).HasColumnType("TEXT").IsRequired(false);
            entity.Property(p => p.ShareJson).HasColumnType("TEXT").IsRequired(false);
            entity.Property(p => p.DeletedAt).IsRequired(false);
            entity.Property(p => p.LinkSharingEnabled).HasDefaultValue(false).IsRequired();
        });

        modelBuilder.Entity<Workspace>(entity =>
        {
            entity.Property(w => w.NavigationTreeJson).HasColumnType("TEXT").IsRequired(false);
        });
    }
}
