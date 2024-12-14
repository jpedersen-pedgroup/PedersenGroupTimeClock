using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using PedersenGroupTimeClock.Data;
using PedersenGroupTimeClock.Models;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace PedersenGroupTimeClock.Controllers
{
    public class TicketsController : Controller
    {
        private readonly ApplicationDbContext _context;

        public TicketsController(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IActionResult> Index()
        {
            var tickets = await _context.Tickets
                .Include(t => t.TimeEntries)
                .Include(t => t.Rate)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            // Get employees for the dropdown
            ViewBag.Employees = await _context.Employees
                .Where(e => e.IsActive)
                .OrderBy(e => e.LastName)
                .ThenBy(e => e.FirstName)
                .Select(e => new SelectListItem
                {
                    Value = e.Id.ToString(),
                    Text = e.FullName
                })
                .ToListAsync();

            // Get employee names for display
            var employeeDict = await _context.Employees
                .ToDictionaryAsync(e => e.Id, e => e.FullName);
            ViewBag.EmployeeNames = employeeDict;

            ViewBag.Clients = await _context.Clients
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .Select(c => new SelectListItem
                {
                    Value = c.Id.ToString(),
                    Text = c.Name
                })
                .ToListAsync();

            var clientDict = await _context.Clients
                .ToDictionaryAsync(c => c.Id, c => c.Name);
                ViewBag.ClientNames = clientDict;

            return View(tickets);
        }

        // GET: Tickets/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
                return NotFound();

            var ticket = await _context.Tickets
                .Include(t => t.TimeEntries)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (ticket == null)
                return NotFound();

            return PartialView("_Details", ticket);
        }

        // GET: Tickets/Create
        public async Task<IActionResult> CreateAsync()
        {

            await PrepareSelectLists();
            return View();
        }

        // GET: Tickets/Edit/5
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
                return NotFound();

            var ticket = await _context.Tickets
                .Include(t => t.ChecklistItems.OrderBy(c => c.Order))  // Include and order checklist items
                .Include(t => t.Rate)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (ticket == null)
                return NotFound();

            await PrepareSelectLists();
            return View(ticket);
        }

        // POST: Tickets/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, [Bind("Id,ClientId,Title,Description,Status,Priority,AssignedTo,RateId,BudgetHours,CreatedAt")] Ticket ticket, List<string> ChecklistItems)
        {
            if (id != ticket.Id)
                return NotFound();

            ModelState.Remove("Rate");
            ModelState.Remove("Employees");
            ModelState.Remove("Client");

            if (ModelState.IsValid)
            {
                try
                {
                    ticket.UpdatedAt = DateTime.UtcNow;

                    // Get existing checklist items
                    var existingItems = await _context.TicketChecklistItems
                        .Where(c => c.TicketId == id)
                        .ToListAsync();

                    // Remove existing items
                    _context.TicketChecklistItems.RemoveRange(existingItems);

                    // Add new items
                    if (ChecklistItems != null && ChecklistItems.Any())
                    {
                        var order = 0;
                        var newItems = ChecklistItems
                            .Where(item => !string.IsNullOrWhiteSpace(item))
                            .Select(item => new TicketChecklistItem
                            {
                                TicketId = id,
                                Description = item,
                                Order = order++,
                                IsCompleted = false
                            });

                        await _context.TicketChecklistItems.AddRangeAsync(newItems);
                    }

                    _context.Update(ticket);
                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!TicketExists(ticket.Id))
                        return NotFound();
                    else
                        throw;
                }
            }

            await PrepareSelectLists();
            return View(ticket);
        }


        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddTimeEntry(int ticketId, TimeEntry timeEntry)
        {
            try
            {
                // Remove TimeEntries validation if it exists
                ModelState.Remove("timeEntry.Employee");
                ModelState.Remove("timeEntry.Ticket");

                if (ModelState.IsValid)
                {
                    // Get the current employee (you'll need to implement your own logic here)
                    var employeeEmail = User.Identity.Name;
                    var employee = await _context.Employees
                        .FirstOrDefaultAsync(e => e.Email == employeeEmail);

                    if (employee == null)
                    {
                        return Json(new { success = false, message = "Employee not found" });
                    }

                    timeEntry.TicketId = timeEntry.TicketId;
                    timeEntry.EmployeeId = employee.Id;
                    timeEntry.EntryDate = DateTime.UtcNow;

                    _context.TimeEntries.Add(timeEntry);
                    await _context.SaveChangesAsync();

                    var totalTime = await _context.TimeEntries
                        .Where(t => t.TicketId == ticketId)
                        .SumAsync(t => t.Duration.TotalHours);

                    return Json(new
                    {
                        success = true,
                        totalTime = totalTime.ToString("F1"),
                        newEntry = new
                        {
                            description = timeEntry.Description,
                            duration = timeEntry.Duration.TotalHours.ToString("F1"),
                            date = timeEntry.EntryDate.ToString("MMM dd, yyyy HH:mm"),
                            employee = employee.FullName
                        }
                    });
                }

                return Json(new { success = false, message = "Invalid time entry data" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error saving time entry" });
            }
        }

        // API endpoint for real-time timer updates
        [HttpPost]
        public async Task<IActionResult> UpdateTimer(int ticketId, double elapsedSeconds)
        {
            var ticket = await _context.Tickets.FindAsync(ticketId);
            if (ticket == null)
                return NotFound();

            return Json(new
            {
                success = true,
                formattedTime = TimeSpan.FromSeconds(elapsedSeconds).ToString(@"hh\:mm\:ss")
            });
        }

        private bool TicketExists(int id)
        {
            return _context.Tickets.Any(e => e.Id == id);
        }

        [HttpGet]
        public async Task<IActionResult> BudgetReport(int id)
        {
            var ticket = await _context.Tickets
                .Include(t => t.TimeEntries)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (ticket == null)
                return NotFound();

            // Prepare data for charts
            var dailyTimeData = ticket.TimeEntries
                .GroupBy(te => te.EntryDate.Date)
                .Select(g => new
                {
                    date = g.Key.ToString("MM/dd/yyyy"),
                    hours = g.Sum(te => te.Duration.TotalHours)
                })
                .OrderBy(x => x.date)
                .ToList();

            // Add data to ViewBag for JavaScript
            ViewBag.DailyTimeData = JsonSerializer.Serialize(dailyTimeData);
            ViewBag.TimeEntriesData = JsonSerializer.Serialize(ticket.TimeEntries);

            return View(ticket);
        }

        [HttpGet]
        public async Task<IActionResult> GetTimeEntry(int id)
        {
            var timeEntry = await _context.TimeEntries.FindAsync(id);
            if (timeEntry == null)
                return NotFound();

            return Json(new
            {
                id = timeEntry.Id,
                description = timeEntry.Description,
                duration = timeEntry.Duration.TotalHours
            });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditTimeEntry(int id, string description, double hours)
        {
            var timeEntry = await _context.TimeEntries
                .Include(te => te.Ticket)
                .FirstOrDefaultAsync(te => te.Id == id);

            if (timeEntry == null)
                return NotFound();

            timeEntry.Description = description;
            timeEntry.Duration = TimeSpan.FromHours(hours);

            await _context.SaveChangesAsync();

            return Json(new
            {
                success = true,
                totalTime = timeEntry.Ticket.TotalHoursSpent.ToString("F1"),
                budgetRemaining = timeEntry.Ticket.BudgetRemaining.ToString("F1")
            });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteTimeEntry(int id)
        {
            var timeEntry = await _context.TimeEntries
                .Include(te => te.Ticket)
                .FirstOrDefaultAsync(te => te.Id == id);

            if (timeEntry == null)
                return NotFound();

            _context.TimeEntries.Remove(timeEntry);
            await _context.SaveChangesAsync();

            return Json(new
            {
                success = true,
                totalTime = timeEntry.Ticket.TotalHoursSpent.ToString("F1"),
                budgetRemaining = timeEntry.Ticket.BudgetRemaining.ToString("F1")
            });
        }

        private async Task PrepareSelectLists()
        {
            ViewBag.Rates = await _context.Rates
                .Where(r => r.IsActive)
                .Select(r => new SelectListItem
                {
                    Value = r.Id.ToString(),
                    //Text = r.Name
                    Text = $"{r.Name} (${r.HourlyRate}/hour)"
                })
                .ToListAsync();

            ViewBag.Employees = await _context.Employees
                .Where(e => e.IsActive)
                .OrderBy(e => e.LastName)
                .ThenBy(e => e.FirstName)
                .Select(e => new SelectListItem
                {
                    Value = e.Id.ToString(),
                    Text = e.FirstName
                })
                .ToListAsync();

            ViewBag.Clients = await _context.Clients
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .Select(c => new SelectListItem
                {
                    Value = c.Id.ToString(),
                    Text = c.Name
                })
                .ToListAsync();
        }

        [HttpGet]
        public async Task<IActionResult> GetChecklistItems(int id)
        {
            var items = await _context.TicketChecklistItems
                .Where(i => i.TicketId == id)
                .OrderBy(i => i.Order)
                .Select(i => new { id = i.Id, description = i.Description, isCompleted = i.IsCompleted })
                .ToListAsync();

            return Json(items);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(CreateTicketViewModel model)
        {
            if (ModelState.IsValid)
            {
                var ticket = new Ticket
                {
                    Title = model.Title,
                    Description = model.Description,
                    Status = model.Status,
                    Priority = model.Priority,
                    AssignedTo = model.AssignedTo,
                    ClientId = model.ClientId,
                    RateId = model.RateId,
                    BudgetHours = model.BudgetHours,
                    CreatedAt = DateTime.UtcNow
                };

                // Add checklist items if any
                if (model.ChecklistItems != null && model.ChecklistItems.Any())
                {
                    var order = 0;
                    foreach (var item in model.ChecklistItems.Where(i => !string.IsNullOrWhiteSpace(i)))
                    {
                        ticket.ChecklistItems.Add(new TicketChecklistItem
                        {
                            Description = item,
                            Order = order++,
                            IsCompleted = false
                        });
                    }
                }

                _context.Add(ticket);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }

            PrepareSelectLists();
            return View(model);
        }
    }
}
