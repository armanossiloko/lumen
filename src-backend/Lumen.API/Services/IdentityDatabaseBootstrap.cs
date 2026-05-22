using Lumen.API.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Lumen.API.Services;

/// <summary>
/// Recreates the SQLite file when upgrading from the legacy non-Identity schema.
/// </summary>
public static class IdentityDatabaseBootstrap
{
    public static void EnsureCompatible(AppDbContext db, string dbPath, IWebHostEnvironment env)
    {
        if (IdentityTablesExist(db))
            return;

        var conn = db.Database.GetDbConnection();
        if (conn.State == System.Data.ConnectionState.Open)
            conn.Close();
        SqliteConnection.ClearAllPools();

        if (File.Exists(dbPath))
        {
            try
            {
                File.Delete(dbPath);
            }
            catch (IOException ex)
            {
                throw new InvalidOperationException(
                    "Cannot upgrade lumen.db to Identity while the database file is in use. Stop the Lumen API, then restart.",
                    ex);
            }
        }
    }

    private static bool IdentityTablesExist(AppDbContext db)
    {
        try
        {
            var conn = db.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
                conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT 1 FROM AspNetUsers LIMIT 1";
            cmd.ExecuteScalar();
            return true;
        }
        catch (SqliteException)
        {
            return false;
        }
    }
}
