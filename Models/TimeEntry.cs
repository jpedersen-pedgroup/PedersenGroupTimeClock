using System.ComponentModel.DataAnnotations;

namespace PedersenGroupTimeClock.Models
{
    // Models/TimeEntry.cs
    public class TimeEntry
    {
        public int Id { get; set; }

        public int TicketId { get; set; }

        [Required]
        public string Description { get; set; }

        public TimeSpan Duration { get; set; }

        [Required]
        public int EmployeeId { get; set; }  // Changed from UserId

        public DateTime EntryDate { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual Ticket Ticket { get; set; }
        public virtual Employee Employee { get; set; }
    }
}
