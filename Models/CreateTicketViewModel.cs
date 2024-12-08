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
        public string Title { get; set; }

        [Required]
        public string Description { get; set; }

        public TicketStatus Status { get; set; }

        public TicketPriority Priority { get; set; }

        [Required]
        public int AssignedTo { get; set; }

        public int? RateId { get; set; }

        public decimal BudgetHours { get; set; }

        public List<string> ChecklistItems { get; set; }
    }
}
