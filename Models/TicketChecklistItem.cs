namespace PedersenGroupTimeClock.Models
{
    public class TicketChecklistItem
    {
        public int Id { get; set; }
        public int TicketId { get; set; }
        public string Description { get; set; }
        public bool IsCompleted { get; set; }
        public int Order { get; set; }
        public virtual Ticket Ticket { get; set; }
    }
}
