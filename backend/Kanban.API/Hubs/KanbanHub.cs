using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Kanban.API.Data;
using Kanban.API.Models;

namespace Kanban.API.Hubs
{
    public class KanbanHub : Hub
    {
        private readonly KanbanDbContext _context;

        public KanbanHub(KanbanDbContext context)
        {
            _context = context;
        }

        public async Task JoinBoard(string boardId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, boardId);
        }

        public async Task LeaveBoard(string boardId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, boardId);
        }

        public async Task MoveTask(string boardId, MoveTaskDto dto)
        {
            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == dto.TaskId);
            if (task == null) return;

            // Simple reordering logic
            if (dto.SourceColumnId == dto.TargetColumnId)
            {
                // Reorder within same column
                var tasks = await _context.Tasks
                    .Where(t => t.ColumnId == dto.SourceColumnId)
                    .OrderBy(t => t.Order)
                    .ToListAsync();

                tasks.Remove(task);
                tasks.Insert(Math.Min(dto.NewIndex, tasks.Count), task);

                for (int i = 0; i < tasks.Count; i++)
                {
                    tasks[i].Order = i;
                    tasks[i].UpdatedAt = DateTime.UtcNow;
                }
            }
            else
            {
                // Move to another column
                task.ColumnId = dto.TargetColumnId;
                task.UpdatedAt = DateTime.UtcNow;

                var sourceTasks = await _context.Tasks
                    .Where(t => t.ColumnId == dto.SourceColumnId && t.Id != dto.TaskId)
                    .OrderBy(t => t.Order)
                    .ToListAsync();

                for (int i = 0; i < sourceTasks.Count; i++)
                {
                    sourceTasks[i].Order = i;
                }

                var targetTasks = await _context.Tasks
                    .Where(t => t.ColumnId == dto.TargetColumnId)
                    .OrderBy(t => t.Order)
                    .ToListAsync();

                targetTasks.Insert(Math.Min(dto.NewIndex, targetTasks.Count), task);

                for (int i = 0; i < targetTasks.Count; i++)
                {
                    targetTasks[i].Order = i;
                }
            }

            await _context.SaveChangesAsync();

            // Broadcast move event to all other clients on the board
            await Clients.Group(boardId).SendAsync("TaskMoved", dto);
        }
    }
}
