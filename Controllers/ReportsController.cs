using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using PedersenGroupTimeClock.Data;
using PedersenGroupTimeClock.Models;
using static PedersenGroupTimeClock.Models.Enums;

namespace PedersenGroupTimeClock.Controllers
{
    public class ReportsController : Controller
    {
        private readonly ApplicationDbContext _context;

        public ReportsController(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IActionResult> FiscalYear(int? fiscalYear = null)
        {
            // Calculate fiscal year dates
            var today = DateTime.UtcNow;
            var currentFiscalYear = today.Month < 4 ? today.Year - 1 : today.Year;
            fiscalYear ??= currentFiscalYear;

            var startDate = new DateTime(fiscalYear.Value, 4, 1);
            var endDate = startDate.AddYears(1).AddDays(-1);
            var lastYearStartDate = startDate.AddYears(-1);
            var lastYearEndDate = endDate.AddYears(-1);

            // Get clients with data for both current and previous fiscal year
            var clients = await _context.Clients
                .Include(c => c.Tickets)
                    .ThenInclude(t => t.TimeEntries)
                .Include(c => c.Tickets)
                    .ThenInclude(t => t.Rate)
                .ToListAsync();

            var viewModel = new FiscalYearReportViewModel
            {
                CurrentFiscalYear = $"FY{fiscalYear}/{fiscalYear + 1}",
                DateRange = $"{startDate:d MMM yyyy} - {endDate:d MMM yyyy}",
                AvailableFiscalYears = Enumerable.Range(0, 5)
                    .Select(i => currentFiscalYear - i)
                    .Select(year => new SelectListItem
                    {
                        Value = year.ToString(),
                        Text = $"FY{year}/{year + 1}",
                        Selected = year == fiscalYear
                    }).ToList(),
                ClientStats = await GetClientStats(clients, startDate, endDate),
                YoyComparison = await GetYearOverYearComparison(clients, startDate, endDate, lastYearStartDate, lastYearEndDate),
                QuarterlyStats = await GetQuarterlyBreakdown(clients, startDate, endDate)
            };

            return View(viewModel);
        }

        private async Task<List<ClientFiscalYearStats>> GetClientStats(List<Client> clients, DateTime startDate, DateTime endDate)
        {
            return clients.Select(c => new ClientFiscalYearStats
            {
                ClientId = c.Id,
                ClientName = c.Name,
                TotalTickets = c.Tickets.Count(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate),
                ActiveTickets = c.Tickets.Count(t => t.Status != TicketStatus.Closed && t.CreatedAt >= startDate && t.CreatedAt <= endDate),
                TotalHours = c.Tickets
                    .SelectMany(t => t.TimeEntries)
                    .Where(te => te.EntryDate >= startDate && te.EntryDate <= endDate)
                    .Sum(te => te.Duration.TotalHours),
                TotalBudgetedHours = c.Tickets
                    .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate)
                    .Sum(t => t.BudgetHours),
                TotalCost = c.Tickets
                    .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate)
                    .Sum(t => t.Rate != null ?
                        t.Rate.HourlyRate * (decimal)t.TimeEntries
                            .Where(te => te.EntryDate >= startDate && te.EntryDate <= endDate)
                            .Sum(te => te.Duration.TotalHours) : 0),
                TotalBudget = c.Tickets
                    .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate)
                    .Sum(t => t.Rate != null ? t.Rate.HourlyRate * t.BudgetHours : 0),
                WeeklyData = GetWeeklyData(c, startDate, endDate)
            }).ToList();
        }

        private List<WeeklyHours> GetWeeklyData(Client client, DateTime startDate, DateTime endDate)
        {

            var weeklyData = client.Tickets
                .SelectMany(t => t.TimeEntries)
                .Where(te => te.EntryDate >= startDate && te.EntryDate <= endDate)
                .GroupBy(te => ((te.EntryDate - startDate).Days / 7))
                .Select(g => new WeeklyHours
                {
                    WeekNumber = g.Key,
                    WeekLabel = $"Wk {g.Key + 1}",
                    Hours = g.Sum(te => te.Duration.TotalHours)
                })
                .OrderBy(w => w.WeekNumber)
                .ToList();

            // Fill in missing weeks with zero hours
            var totalWeeks = (int)((endDate - startDate).TotalDays / 7) + 1;
            for (int i = 0; i < totalWeeks; i++)
            {
                if (!weeklyData.Any(w => w.WeekNumber == i))
                {
                    weeklyData.Add(new WeeklyHours
                    {
                        WeekNumber = i,
                        WeekLabel = $"Wk {i + 1}",
                        Hours = null
                    });
                }
            }

            return weeklyData.OrderBy(w => w.WeekNumber).ToList();
        }

        private async Task<YearOverYearComparison> GetYearOverYearComparison(
            List<Client> clients,
            DateTime startDate,
            DateTime endDate,
            DateTime lastYearStartDate,
            DateTime lastYearEndDate)
        {
            var comparison = new YearOverYearComparison
            {
                ClientComparisons = new List<ClientYoyComparison>()
            };

            foreach (var client in clients)
            {
                var thisYearHours = client.Tickets
                    .SelectMany(t => t.TimeEntries)
                    .Where(te => te.EntryDate >= startDate && te.EntryDate <= endDate)
                    .Sum(te => te.Duration.TotalHours);

                var lastYearHours = client.Tickets
                    .SelectMany(t => t.TimeEntries)
                    .Where(te => te.EntryDate >= lastYearStartDate && te.EntryDate <= lastYearEndDate)
                    .Sum(te => te.Duration.TotalHours);

                comparison.ClientComparisons.Add(new ClientYoyComparison
                {
                    ClientName = client.Name,
                    ThisYearHours = (decimal)thisYearHours,
                    LastYearHours = (decimal)lastYearHours,
                    GrowthPercentage = lastYearHours > 0 ?
                        ((decimal)thisYearHours - (decimal)lastYearHours) / (decimal)lastYearHours * 100 :
                        0
                });
            }

            return comparison;
        }

        private async Task<List<QuarterlyBreakdown>> GetQuarterlyBreakdown(
            List<Client> clients,
            DateTime startDate,
            DateTime endDate)
        {
            var quarters = new List<QuarterlyBreakdown>();

            for (int i = 0; i < 4; i++)
            {
                var quarterStart = startDate.AddMonths(i * 3);
                var quarterEnd = quarterStart.AddMonths(3).AddDays(-1);

                var quarterlyData = new QuarterlyBreakdown
                {
                    Quarter = i + 1,
                    QuarterLabel = $"Q{i + 1}",
                    ClientHours = new Dictionary<string, decimal>()
                };

                foreach (var client in clients)
                {
                    var hours = client.Tickets
                        .SelectMany(t => t.TimeEntries)
                        .Where(te => te.EntryDate >= quarterStart && te.EntryDate <= quarterEnd)
                        .Sum(te => te.Duration.TotalHours);

                    quarterlyData.ClientHours[client.Name] = (decimal)hours;
                }

                quarterlyData.TotalHours = quarterlyData.ClientHours.Values.Sum();
                quarterlyData.ActiveClients = quarterlyData.ClientHours.Count(ch => ch.Value > 0);

                quarters.Add(quarterlyData);
            }

            return quarters;
        }
    }
}
