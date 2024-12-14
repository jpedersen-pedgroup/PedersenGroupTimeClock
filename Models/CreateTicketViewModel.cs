using static PedersenGroupTimeClock.Models.Enums;
using System.ComponentModel.DataAnnotations;

namespace PedersenGroupTimeClock.Models
{
    public class CreateTicketViewModel
    {
        public CreateTicketViewModel()
        {
            ChecklistItems = new List<string>();
        }

        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        public TicketStatus Status { get; set; }

        public TicketPriority Priority { get; set; }

        [Required]
        public int AssignedTo { get; set; }

        [Required]
        public int ClientId { get; set; }  // Add this line

        public int? RateId { get; set; }

        public decimal BudgetHours { get; set; }

        public List<string> ChecklistItems { get; private set; }
    }
}
