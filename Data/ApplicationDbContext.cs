using Microsoft.EntityFrameworkCore;
using PedersenGroupTimeClock.Models;

namespace PedersenGroupTimeClock.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Ticket> Tickets { get; set; }
        public DbSet<TimeEntry> TimeEntries { get; set; }
        public DbSet<Rate> Rates { get; set; }
        public DbSet<RateHistory> RateHistory { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<TicketChecklistItem> TicketChecklistItems { get; set; }
        public DbSet<Client> Clients { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<TimeEntry>()
                .HasOne(t => t.Employee)
                .WithMany(e => e.TimeEntries)
                .HasForeignKey(t => t.EmployeeId)
                .OnDelete(DeleteBehavior.NoAction);  // Add this

            modelBuilder.Entity<TimeEntry>()
                .HasOne(t => t.Ticket)
                .WithMany(t => t.TimeEntries)
                .HasForeignKey(t => t.TicketId)
                .OnDelete(DeleteBehavior.NoAction);  // Add this

            modelBuilder.Entity<TicketChecklistItem>()
                .HasOne(t => t.Ticket)
                .WithMany(t => t.ChecklistItems)
                .HasForeignKey(t => t.TicketId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
