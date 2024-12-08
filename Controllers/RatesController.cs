using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PedersenGroupTimeClock.Data;
using PedersenGroupTimeClock.Models;

namespace PedersenGroupTimeClock.Controllers
{
    public class RatesController : Controller
    {
        private readonly ApplicationDbContext _context;

        public RatesController(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IActionResult> Index()
        {
            var rates = await _context.Rates
                .Include(r => r.Tickets)
                .OrderBy(r => r.Name)
                .ToListAsync();
            return View(rates);
        }

        public IActionResult Create()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(Rate rate)
        {
            // Remove any Tickets validation if it exists
            ModelState.Remove("Tickets");

            if (ModelState.IsValid)
            {
                _context.Add(rate);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            return View(rate);
        }

        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
                return NotFound();

            var rate = await _context.Rates.FindAsync(id);
            if (rate == null)
                return NotFound();

            return View(rate);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, Rate rate)
        {
            if (id != rate.Id)
                return NotFound();

            if (ModelState.IsValid)
            {
                try
                {
                    var existingRate = await _context.Rates.FindAsync(id);
                    existingRate.Name = rate.Name;
                    existingRate.Description = rate.Description;
                    existingRate.IsActive = rate.IsActive;

                    // Create rate history when rate changes
                    if (existingRate.HourlyRate != rate.HourlyRate)
                    {
                        var rateHistory = new RateHistory
                        {
                            RateId = id,
                            OldRate = existingRate.HourlyRate,
                            NewRate = rate.HourlyRate,
                            ChangeDate = DateTime.UtcNow
                        };
                        _context.RateHistory.Add(rateHistory);
                        existingRate.HourlyRate = rate.HourlyRate;
                    }

                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!RateExists(rate.Id))
                        return NotFound();
                    throw;
                }
            }
            return View(rate);
        }

        public async Task<IActionResult> History(int? id)
        {
            if (id == null)
                return NotFound();

            var rate = await _context.Rates
                .FirstOrDefaultAsync(r => r.Id == id);

            if (rate == null)
                return NotFound();

            ViewBag.RateName = rate.Name;

            var history = await _context.RateHistory
                .Where(h => h.RateId == id)
                .OrderByDescending(h => h.ChangeDate)
                .ToListAsync();

            return View(history);
        }

        private bool RateExists(int id)
        {
            return _context.Rates.Any(e => e.Id == id);
        }

        [HttpGet]
        public async Task<IActionResult> GetRateDetails(int id)
        {
            var rate = await _context.Rates.FindAsync(id);
            if (rate == null)
                return NotFound();

            return Json(new
            {
                hourlyRate = rate.HourlyRate.ToString("C2"),
                description = rate.Description
            });
        }
    }
}
