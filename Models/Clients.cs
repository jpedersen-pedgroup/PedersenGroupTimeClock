using System.ComponentModel.DataAnnotations;

namespace PedersenGroupTimeClock.Models
{
    // Models/Client.cs
    public class Client
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; }

        public string Description { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    }
}
