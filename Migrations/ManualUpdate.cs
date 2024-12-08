using Microsoft.EntityFrameworkCore.Migrations;

public partial class ReworkRelationships : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Drop existing tables to rebuild with correct relationships
        migrationBuilder.DropTable(name: "TimeEntries");
        migrationBuilder.DropTable(name: "TicketChecklistItems");
        migrationBuilder.DropTable(name: "Tickets");

        // Recreate Tickets table
        migrationBuilder.CreateTable(
            name: "Tickets",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                Status = table.Column<int>(type: "int", nullable: false),
                Priority = table.Column<int>(type: "int", nullable: false),
                AssignedToId = table.Column<int>(type: "int", nullable: false),
                RateId = table.Column<int>(type: "int", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Tickets", x => x.Id);
                table.ForeignKey(
                    name: "FK_Tickets_Rates_RateId",
                    column: x => x.RateId,
                    principalTable: "Rates",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        // Recreate TimeEntries table with NoAction
        migrationBuilder.CreateTable(
            name: "TimeEntries",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                TicketId = table.Column<int>(type: "int", nullable: false),
                Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                Duration = table.Column<TimeSpan>(type: "time", nullable: false),
                EmployeeId = table.Column<int>(type: "int", nullable: false),
                EntryDate = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_TimeEntries", x => x.Id);
                table.ForeignKey(
                    name: "FK_TimeEntries_Employees_EmployeeId",
                    column: x => x.EmployeeId,
                    principalTable: "Employees",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.NoAction);
                table.ForeignKey(
                    name: "FK_TimeEntries_Tickets_TicketId",
                    column: x => x.TicketId,
                    principalTable: "Tickets",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.NoAction);
            });

        // Add indexes
        migrationBuilder.CreateIndex(
            name: "IX_TimeEntries_EmployeeId",
            table: "TimeEntries",
            column: "EmployeeId");

        migrationBuilder.CreateIndex(
            name: "IX_TimeEntries_TicketId",
            table: "TimeEntries",
            column: "TicketId");

        migrationBuilder.CreateIndex(
            name: "IX_Tickets_RateId",
            table: "Tickets",
            column: "RateId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "TimeEntries");
        migrationBuilder.DropTable(name: "TicketChecklistItems");
        migrationBuilder.DropTable(name: "Tickets");
    }
}