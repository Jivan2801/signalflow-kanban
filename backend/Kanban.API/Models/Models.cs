using System;
using System.Collections.Generic;

namespace Kanban.API.Models
{
    public class Board
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<Column> Columns { get; set; } = new List<Column>();
    }

    public class Column
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string BoardId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int Order { get; set; }
        public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    }

    public class TaskItem
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string ColumnId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int Order { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // DTOs for SignalR & API
    public record CreateTaskDto(string ColumnId, string Title, string Description);
    public record MoveTaskDto(string TaskId, string SourceColumnId, string TargetColumnId, int NewIndex);
    public record CreateColumnDto(string BoardId, string Name);
}
