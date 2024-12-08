using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using static PedersenGroupTimeClock.Models.Enums;

namespace PedersenGroupTimeClock.Models
{
    public class Ticket
    {
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        [Required]
        public string Description { get; set; }

        public TicketStatus Status { get; set; }

        public TicketPriority Priority { get; set; }

        [Required]
        [Display(Name = "Assigned To")]
        public int AssignedTo { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Add budget fields
        [SmartNumberFormat]
        public decimal BudgetHours { get; set; }

        public int? RateId { get; set; }

        public virtual ICollection<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
        public virtual ICollection<TicketChecklistItem> ChecklistItems { get; set; } = new List<TicketChecklistItem>();
        public virtual Rate Rate { get; set; }
        public virtual Employee Employees { get; set; }

        // Computed properties
        [NotMapped]
        public double TotalHoursSpent => TimeEntries?.Sum(te => te.Duration.TotalHours) ?? 0;

        [NotMapped]
        public decimal BudgetRemaining => BudgetHours - (decimal)TotalHoursSpent;

        [NotMapped]
        public decimal ActualCost => (decimal)TotalHoursSpent * HourlyRate;

        [NotMapped]
        public decimal BudgetCost => BudgetHours * HourlyRate;

        [NotMapped]
        public decimal HourlyRate => Rate?.HourlyRate ?? 0;

    }
    public class SmartNumberFormatAttribute : DisplayFormatAttribute
    {
        public SmartNumberFormatAttribute()
        {
            DataFormatString = "{0:0.##}";  // Shows up to 2 decimals only when needed
        }
    }
}
