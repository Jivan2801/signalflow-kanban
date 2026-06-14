using Microsoft.EntityFrameworkCore;
using Kanban.API.Models;

namespace Kanban.API.Data
{
    public class KanbanDbContext : DbContext
    {
        public KanbanDbContext(DbContextOptions<KanbanDbContext> options) : base(options)
        {
        }

        public DbSet<Board> Boards { get; set; } = null!;
        public DbSet<Column> Columns { get; set; } = null!;
        public DbSet<TaskItem> Tasks { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure relationships
            modelBuilder.Entity<Board>()
                .HasMany(b => b.Columns)
                .WithOne()
                .HasForeignKey(c => c.BoardId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Column>()
                .HasMany(c => c.Tasks)
                .WithOne()
                .HasForeignKey(t => t.ColumnId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
