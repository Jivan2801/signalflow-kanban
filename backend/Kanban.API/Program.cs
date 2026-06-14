using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Kanban.API.Data;
using Kanban.API.Hubs;
using Kanban.API.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddSignalR();

// Database configuration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Data Source=kanban.db";
builder.Services.AddDbContext<KanbanDbContext>(options =>
    options.UseSqlite(connectionString));

// CORS Configuration
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000") // Frontend URL
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Required for SignalR
    });
});

var app = builder.Build();

// Enable CORS
app.UseCors();

// Ensure Database is Created & Seeded
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<KanbanDbContext>();
    db.Database.EnsureCreated();
    
    // Seed default board if none exists
    if (!db.Boards.Any())
    {
        var board = new Board { Id = "default", Name = "Development Board" };
        var col1 = new Column { Id = "todo", BoardId = "default", Name = "To Do", Order = 0 };
        var col2 = new Column { Id = "in-progress", BoardId = "default", Name = "In Progress", Order = 1 };
        var col3 = new Column { Id = "done", BoardId = "default", Name = "Done", Order = 2 };

        board.Columns.Add(col1);
        board.Columns.Add(col2);
        board.Columns.Add(col3);

        db.Boards.Add(board);
        db.SaveChanges();
    }
}

// REST Endpoints
app.MapGet("/api/board/{id}", async (string id, KanbanDbContext db) =>
{
    var board = await db.Boards
        .Include(b => b.Columns.OrderBy(c => c.Order))
        .ThenInclude(c => c.Tasks.OrderBy(t => t.Order))
        .FirstOrDefaultAsync(b => b.Id == id);
        
    return board is not null ? Results.Ok(board) : Results.NotFound();
});

app.MapPost("/api/tasks", async (CreateTaskDto dto, KanbanDbContext db, Microsoft.AspNetCore.SignalR.IHubContext<KanbanHub> hubContext) =>
{
    var column = await db.Columns.FindAsync(dto.ColumnId);
    if (column == null) return Results.NotFound("Column not found");

    var maxOrder = await db.Tasks
        .Where(t => t.ColumnId == dto.ColumnId)
        .Select(t => (int?)t.Order)
        .MaxAsync() ?? -1;

    var task = new TaskItem
    {
        ColumnId = dto.ColumnId,
        Title = dto.Title,
        Description = dto.Description,
        Order = maxOrder + 1
    };

    db.Tasks.Add(task);
    await db.SaveChangesAsync();

    // Notify all clients on the board that a task was created
    await hubContext.Clients.Group(column.BoardId).SendAsync("TaskCreated", task);

    return Results.Created($"/api/tasks/{task.Id}", task);
});

app.MapDelete("/api/tasks/{id}", async (string id, KanbanDbContext db, Microsoft.AspNetCore.SignalR.IHubContext<KanbanHub> hubContext) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task == null) return Results.NotFound();

    var column = await db.Columns.FindAsync(task.ColumnId);
    db.Tasks.Remove(task);
    await db.SaveChangesAsync();

    if (column != null)
    {
        await hubContext.Clients.Group(column.BoardId).SendAsync("TaskDeleted", id);
    }

    return Results.NoContent();
});

// Map SignalR Hub
app.MapHub<KanbanHub>("/kanbanhub");

app.Run();
