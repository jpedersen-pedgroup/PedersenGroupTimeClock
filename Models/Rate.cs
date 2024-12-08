using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace PedersenGroupTimeClock.Models
{
    // Models/Rate.cs
    public class Rate
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; }  // e.g., "Standard", "Premium", "Discount"

        [Column(TypeName = "decimal(18,2)")]
        public decimal HourlyRate { get; set; }

        public string Description { get; set; }

        public bool IsActive { get; set; } = true;

        // Navigation property
        public virtual ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    }

}
