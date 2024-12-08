using Microsoft.AspNetCore.Mvc;
using PedersenGroupTimeClock.Data;
using PedersenGroupTimeClock.Models;
using Microsoft.EntityFrameworkCore;


namespace PedersenGroupTimeClock.Controllers
{
    public class EmployeesController : Controller
    {
        private readonly ApplicationDbContext _context;

        public EmployeesController(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IActionResult> Index()
        {
            var employees = await _context.Employees
                .OrderBy(e => e.LastName)
                .ToListAsync();
            return View(employees);
        }

        public IActionResult Create()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("FirstName,LastName,Email,IsActive")] Employee employee)
        {
            // Remove TimeEntries validation if it exists
            ModelState.Remove("TimeEntries");
            if (ModelState.IsValid)
            {
                _context.Add(employee);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            return View(employee);
        }
    }
}
