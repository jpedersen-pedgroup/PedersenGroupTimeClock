using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PedersenGroupTimeClock.Data;
using PedersenGroupTimeClock.Models;
using static PedersenGroupTimeClock.Models.Enums;

namespace PedersenGroupTimeClock.Controllers
{
    public class ClientsController : Controller
    {
        private readonly ApplicationDbContext _context;

        public ClientsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: Clients
        public async Task<IActionResult> Index()
        {
            var clients = await _context.Clients
                 .Include(c => c.Tickets)
                 .ThenInclude(t => t.TimeEntries)
                 .OrderBy(c => c.Name)
                 .ToListAsync();
            return View(clients);
        }

        // GET: Clients/Create
        public IActionResult Create()
        {
            return View();
        }

        // POST: Clients/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("Name,Description,IsActive")] Client client)
        {
            if (ModelState.IsValid)
            {
                client.CreatedAt = DateTime.UtcNow;
                _context.Add(client);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            return View(client);
        }

        // GET: Clients/Edit/5
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
                return NotFound();

            var client = await _context.Clients.FindAsync(id);
            if (client == null)
                return NotFound();

            return View(client);
        }

        // POST: Clients/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, [Bind("Id,Name,Description,IsActive,CreatedAt")] Client client)
        {
            if (id != client.Id)
                return NotFound();

            if (ModelState.IsValid)
            {
                try
                {
                    _context.Update(client);
                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!ClientExists(client.Id))
                        return NotFound();
                    else
                        throw;
                }
            }
            return View(client);
        }

        private bool ClientExists(int id)
        {
            return _context.Clients.Any(e => e.Id == id);
        }

        public async Task<IActionResult> Report()
        {
            // Get clients with their tickets and time entries
            var clients = await _context.Clients
                .Include(c => c.Tickets)
                    .ThenInclude(t => t.TimeEntries)
                .Include(c => c.Tickets)
                    .ThenInclude(t => t.Rate)
                .ToListAsync();

            // Calculate client statistics
            var clientStats = clients.Select(c => new ClientReportViewModel
            {
                ClientId = c.Id,
                ClientName = c.Name,
                TotalTickets = c.Tickets.Count,
                ActiveTickets = c.Tickets.Count(t => t.Status != TicketStatus.Closed),
                TotalHours = c.Tickets.SelectMany(t => t.TimeEntries).Sum(te => te.Duration.TotalHours),
                TotalBudgetedHours = c.Tickets.Sum(t => t.BudgetHours),
                TotalCost = c.Tickets.Sum(t => t.Rate != null ?
                    t.Rate.HourlyRate * (decimal)t.TimeEntries.Sum(te => te.Duration.TotalHours) : 0),
                TotalBudget = c.Tickets.Sum(t => t.Rate != null ? t.Rate.HourlyRate * t.BudgetHours : 0)
            }).ToList();


            // Calculate financial year
            var today = DateTime.UtcNow;
            var currentFiscalYear = today.Month < 4 ? today.Year - 1 : today.Year;
            var startDate = new DateTime(currentFiscalYear, 4, 1);
            var endDate = startDate.AddYears(1).AddDays(-1); // March 31st of next year

            ViewBag.FiscalYear = $"FY{currentFiscalYear}/{currentFiscalYear + 1}";
            ViewBag.DateRange = $"{startDate:d MMM yyyy} - {endDate:d MMM yyyy}";


            var weeklyData = clients.SelectMany(c => c.Tickets
                .SelectMany(t => t.TimeEntries
                    .Where(te => te.EntryDate >= startDate)
                    .Select(te => new
                    {
                        WeekNumber = (int)((te.EntryDate - startDate).TotalDays / 7),
                        ClientName = c.Name,
                        ClientId = c.Id,
                        Hours = te.Duration.TotalHours
                    })))
                .GroupBy(x => new { x.WeekNumber, x.ClientName, x.ClientId })
                .Select(g => new
                {
                    Week = g.Key.WeekNumber,
                    ClientId = g.Key.ClientId,
                    ClientName = g.Key.ClientName,
                    TotalHours = g.Sum(x => x.Hours)
                })
                .ToList();

            var weeks = weeklyData.Select(wd => wd.Week).Distinct().OrderBy(w => w).ToList();
            var clientNames = clients.Select(c => c.Name).ToList();

            ViewBag.WeeklyData = new
            {
                Weeks = weeks.Select(w => $"Week {w + 1}").ToList(),
                Clients = clientNames,
                Data = clientNames.Select(client => new
                {
                    Label = client,
                    Data = weeks.Select(week =>
                        weeklyData
                            .FirstOrDefault(wd => wd.Week == week && wd.ClientName == client)?.TotalHours ?? 0
                    ).ToList()
                }).ToList()
            };

            return View(clientStats);
        }
    }
}
