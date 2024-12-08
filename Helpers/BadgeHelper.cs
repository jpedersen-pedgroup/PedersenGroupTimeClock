using static PedersenGroupTimeClock.Models.Enums;

namespace PedersenGroupTimeClock.Helpers
{
    public class BadgeHelper
    {
        public static string GetStatusColor(TicketStatus status) => status switch
        {
            TicketStatus.New => "primary",
            TicketStatus.InProgress => "info",
            TicketStatus.OnHold => "warning",
            TicketStatus.Resolved => "success",
            TicketStatus.Closed => "secondary",
            _ => "light"    // Note: use _ instead of * for the default case
        };

        public static string GetPriorityColor(TicketPriority priority) => priority switch
        {
            TicketPriority.Critical => "danger",
            TicketPriority.High => "warning",
            TicketPriority.Medium => "info",
            TicketPriority.Low => "success",
            _ => "light"
        };
    }
}
