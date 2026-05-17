using LumenApi.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace LumenApi.Services;

/// <summary>One-off fixes for SQLite DBs created before newer columns (NULL → EF materialization crash).</summary>
public static class DatabaseRepair
{
    public static void Apply(AppDbContext db)
    {
        TryAddColumn(db, "Pages", "MarkdownBody", "TEXT");
        TryAddColumn(db, "Pages", "ShareJson", "TEXT");
        TryAddColumn(db, "Pages", "LinkSharingEnabled", "INTEGER NOT NULL DEFAULT 0");
        TryAddColumn(db, "Pages", "DeletedAt", "TEXT");
        TryAddColumn(db, "Workspaces", "NavigationTreeJson", "TEXT");
        TryAddColumn(db, "Comments", "ReactionsJson", "TEXT");

        EnsureTable(db, "PageVersions", """
            CREATE TABLE IF NOT EXISTS "PageVersions" (
                "Id" TEXT NOT NULL PRIMARY KEY,
                "PageId" TEXT NOT NULL,
                "Title" TEXT NOT NULL,
                "BlocksJson" TEXT NOT NULL,
                "MarkdownBody" TEXT NULL,
                "SavedAt" TEXT NOT NULL,
                "SavedBy" TEXT NULL
            );
            """);

        EnsureTable(db, "UserFavorites", """
            CREATE TABLE IF NOT EXISTS "UserFavorites" (
                "UserId" TEXT NOT NULL,
                "PageId" TEXT NOT NULL,
                PRIMARY KEY ("UserId", "PageId")
            );
            """);

        EnsureTable(db, "UserPreferences", """
            CREATE TABLE IF NOT EXISTS "UserPreferences" (
                "UserId" TEXT NOT NULL PRIMARY KEY,
                "Theme" TEXT NOT NULL DEFAULT 'dark',
                "Accent" TEXT NOT NULL DEFAULT '#ec4899',
                "CurrentWorkspaceId" TEXT NOT NULL DEFAULT 'acme'
            );
            """);

        BackfillNull(db, "Comments", "ReactionsJson", "{}");
        BackfillNull(db, "Comments", "RepliesJson", "[]");
        BackfillNull(db, "Pages", "ShareJson", "[]");
        // INTEGER booleans — use literal 0/1 (parameterized backfill can leave NULLs on some SQLite builds)
        db.Database.ExecuteSqlRaw("UPDATE \"Pages\" SET \"LinkSharingEnabled\" = 0 WHERE \"LinkSharingEnabled\" IS NULL;");
    }

    private static void EnsureTable(AppDbContext db, string table, string createSql)
    {
        var conn = db.Database.GetDbConnection();
        try
        {
            conn.Open();
            using var check = conn.CreateCommand();
            check.CommandText = $"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}';";
            if (check.ExecuteScalar() != null) return;

            using var create = conn.CreateCommand();
            create.CommandText = createSql;
            create.ExecuteNonQuery();
        }
        finally
        {
            if (conn.State == System.Data.ConnectionState.Open)
                conn.Close();
        }
    }

    private static void TryAddColumn(AppDbContext db, string table, string column, string sqlType)
    {
        var conn = db.Database.GetDbConnection();
        try
        {
            conn.Open();
            using var cmd = conn.CreateCommand();
            var nullableSuffix = sqlType.Contains("NOT NULL", StringComparison.OrdinalIgnoreCase)
                ? ""
                : " NULL";
            cmd.CommandText = $"ALTER TABLE \"{table}\" ADD COLUMN \"{column}\" {sqlType}{nullableSuffix};";
            cmd.ExecuteNonQuery();
        }
        catch (SqliteException)
        {
            // column already exists
        }
        finally
        {
            if (conn.State == System.Data.ConnectionState.Open)
                conn.Close();
        }
    }

    private static void BackfillNull(AppDbContext db, string table, string column, string literal)
    {
        db.Database.ExecuteSqlRaw(
            $"UPDATE \"{table}\" SET \"{column}\" = {{0}} WHERE \"{column}\" IS NULL;",
            literal);
    }
}
