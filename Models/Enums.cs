namespace PedersenGroupTimeClock.Models
{
    public class Enums
    {
        public enum TicketStatus
        {
            New,
            InProgress,
            OnHold,
            Resolved,
            Closed
        }

        public enum TicketPriority
        {
            Low,
            Medium,
            High,
            Critical
        }
    }
}
