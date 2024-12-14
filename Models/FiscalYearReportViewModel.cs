using Microsoft.AspNetCore.Mvc.Rendering;

namespace PedersenGroupTimeClock.Models
{
    public class FiscalYearReportViewModel
    {
        public string CurrentFiscalYear { get; set; }
        public string DateRange { get; set; }
        public List<SelectListItem> AvailableFiscalYears { get; set; }
        public List<ClientFiscalYearStats> ClientStats { get; set; }
        public YearOverYearComparison YoyComparison { get; set; }
        public List<QuarterlyBreakdown> QuarterlyStats { get; set; }
    }

    public class ClientFiscalYearStats
    {
        public int ClientId { get; set; }
        public string ClientName { get; set; }
        public int TotalTickets { get; set; }
        public int ActiveTickets { get; set; }
        public double TotalHours { get; set; }
        public decimal TotalBudgetedHours { get; set; }
        public decimal TotalCost { get; set; }
        public decimal TotalBudget { get; set; }
        public double CompletionRate { get; set; }
        public List<WeeklyHours> WeeklyData { get; set; }
        public decimal BudgetUtilizationPercentage => TotalBudget > 0 ? (TotalCost / TotalBudget) * 100 : 0;
    }

    public class WeeklyHours
    {
        public int WeekNumber { get; set; }
        public string WeekLabel { get; set; }
        public double? Hours { get; set; }
    }

    public class YearOverYearComparison
    {
        public decimal RevenueGrowth { get; set; }
        public decimal HoursGrowth { get; set; }
        public decimal ClientGrowth { get; set; }
        public List<ClientYoyComparison> ClientComparisons { get; set; }
    }

    public class ClientYoyComparison
    {
        public string ClientName { get; set; }
        public decimal LastYearHours { get; set; }
        public decimal ThisYearHours { get; set; }
        public decimal GrowthPercentage { get; set; }
    }

    public class QuarterlyBreakdown
    {
        public int Quarter { get; set; }
        public string QuarterLabel { get; set; }
        public decimal TotalHours { get; set; }
        public decimal TotalRevenue { get; set; }
        public int ActiveClients { get; set; }
        public Dictionary<string, decimal> ClientHours { get; set; }
    }
}
