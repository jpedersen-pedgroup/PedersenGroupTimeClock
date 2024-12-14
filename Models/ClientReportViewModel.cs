namespace PedersenGroupTimeClock.Models
{
    public class ClientReportViewModel
    {
        public int ClientId { get; set; }
        public string ClientName { get; set; }
        public int TotalTickets { get; set; }
        public int ActiveTickets { get; set; }
        public double TotalHours { get; set; }
        public decimal TotalBudgetedHours { get; set; }
        public decimal TotalCost { get; set; }
        public decimal TotalBudget { get; set; }

        public decimal BudgetUtilizationPercentage => TotalBudget > 0 ? (TotalCost / TotalBudget) * 100 : 0;
        public double CompletionPercentage => TotalTickets > 0 ? ((TotalTickets - ActiveTickets) / (double)TotalTickets) * 100 : 0;
    }
}
