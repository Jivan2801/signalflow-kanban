"use client";

import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

interface TaskItem {
  id: string;
  columnId: string;
  title: string;
  description: string;
  order: number;
}

interface Column {
  id: string;
  boardId: string;
  name: string;
  order: number;
  tasks: TaskItem[];
}

interface Board {
  id: string;
  name: string;
  columns: Column[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function KanbanBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeFormColumnId, setActiveFormColumnId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedOverColumnId, setDraggedOverColumnId] = useState<string | null>(null);

  // 1. Fetch board data on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/board/default`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch board");
        return res.json();
      })
      .then((data: Board) => {
        setBoard(data);
      })
      .catch((err) => console.error("Error loading board:", err));
  }, []);

  // 2. Establish SignalR Connection
  useEffect(() => {
    const hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/kanbanhub`)
      .withAutomaticReconnect()
      .build();

    setConnection(hubConnection);
  }, []);

  // 3. Register SignalR Event Listeners
  useEffect(() => {
    if (!connection) return;

    const startConnection = async () => {
      try {
        await connection.start();
        setIsConnected(true);
        console.log("SignalR Connected.");

        // Join board room
        await connection.invoke("JoinBoard", "default");

        // Event: Task Created
        connection.on("TaskCreated", (task: TaskItem) => {
          setBoard((prevBoard) => {
            if (!prevBoard) return null;
            return {
              ...prevBoard,
              columns: prevBoard.columns.map((col) => {
                if (col.id !== task.columnId) return col;
                // Avoid duplication
                if (col.tasks.some((t) => t.id === task.id)) return col;
                return {
                  ...col,
                  tasks: [...col.tasks, task].sort((a, b) => a.order - b.order),
                };
              }),
            };
          });
        });

        // Event: Task Deleted
        connection.on("TaskDeleted", (taskId: string) => {
          setBoard((prevBoard) => {
            if (!prevBoard) return null;
            return {
              ...prevBoard,
              columns: prevBoard.columns.map((col) => ({
                ...col,
                tasks: col.tasks.filter((t) => t.id !== taskId),
              })),
            };
          });
        });

        // Event: Task Moved
        connection.on(
          "TaskMoved",
          (dto: { taskId: string; sourceColumnId: string; targetColumnId: string; newIndex: number }) => {
            setBoard((prevBoard) => {
              if (!prevBoard) return null;

              // Find the task in local state
              let taskToMove: TaskItem | undefined;
              for (const col of prevBoard.columns) {
                taskToMove = col.tasks.find((t) => t.id === dto.taskId);
                if (taskToMove) break;
              }

              if (!taskToMove) return prevBoard;

              // Remove from all columns first
              const cleanedColumns = prevBoard.columns.map((col) => ({
                ...col,
                tasks: col.tasks.filter((t) => t.id !== dto.taskId),
              }));

              // Insert into target column at newIndex
              return {
                ...prevBoard,
                columns: cleanedColumns.map((col) => {
                  if (col.id !== dto.targetColumnId) return col;

                  const updatedTasks = [...col.tasks];
                  // Update columnId reference
                  const updatedTask = { ...taskToMove!, columnId: dto.targetColumnId };
                  updatedTasks.splice(dto.newIndex, 0, updatedTask);

                  // Recalculate orders
                  return {
                    ...col,
                    tasks: updatedTasks.map((t, idx) => ({ ...t, order: idx })),
                  };
                }),
              };
            });
          }
        );
      } catch (err) {
        console.error("SignalR Connection Error: ", err);
        setIsConnected(false);
        setTimeout(startConnection, 5000);
      }
    };

    startConnection();

    return () => {
      connection.stop();
    };
  }, [connection]);

  // Create Task Action
  const handleCreateTask = async (columnId: string) => {
    if (!newTitle.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId, title: newTitle, description: newDesc }),
      });

      if (!res.ok) throw new Error("Failed to create task");

      // Reset form
      setNewTitle("");
      setNewDesc("");
      setActiveFormColumnId(null);
    } catch (err) {
      console.error("Error creating task:", err);
    }
  };

  // Delete Task Action
  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete task");
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  // Drag Start Handler
  const handleDragStart = (e: React.DragEvent, taskId: string, sourceColId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", JSON.stringify({ taskId, sourceColId }));
    e.dataTransfer.effectAllowed = "move";
  };

  // Drag Over Handler
  const handleDragOver = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (draggedOverColumnId !== targetColId) {
      setDraggedOverColumnId(targetColId);
    }
  };

  // Drag Leave Handler
  const handleDragLeave = () => {
    setDraggedOverColumnId(null);
  };

  // Drop Handler
  const handleDrop = async (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setDraggedOverColumnId(null);
    setDraggedTaskId(null);

    const rawData = e.dataTransfer.getData("text/plain");
    if (!rawData) return;

    const { taskId, sourceColId } = JSON.parse(rawData);

    // If dropped in same column at same position, or no connection, skip
    if (!connection || !isConnected) return;

    // In this simple drop logic, we place the task at the end of the column.
    // To support general ordering, we can find the relative mouse Y position, but
    // placing it at the bottom is robust, clean, and perfectly showcases real-time sync.
    const targetColumn = board?.columns.find((c) => c.id === targetColId);
    const newIndex = targetColumn ? targetColumn.tasks.length : 0;

    // Optimistically update local state to feel instant
    setBoard((prevBoard) => {
      if (!prevBoard) return null;

      let taskObj: TaskItem | undefined;
      for (const col of prevBoard.columns) {
        taskObj = col.tasks.find((t) => t.id === taskId);
        if (taskObj) break;
      }

      if (!taskObj) return prevBoard;

      const cleanedColumns = prevBoard.columns.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      }));

      return {
        ...prevBoard,
        columns: cleanedColumns.map((col) => {
          if (col.id !== targetColId) return col;
          const updatedTasks = [...col.tasks];
          updatedTasks.splice(newIndex, 0, { ...taskObj!, columnId: targetColId });
          return {
            ...col,
            tasks: updatedTasks.map((t, idx) => ({ ...t, order: idx })),
          };
        }),
      };
    });

    // Send the move event to backend SignalR Hub
    try {
      await connection.invoke("MoveTask", "default", {
        taskId,
        sourceColumnId: sourceColId,
        targetColumnId: targetColId,
        newIndex,
      });
    } catch (err) {
      console.error("Failed to sync task move:", err);
      // Re-fetch board state to revert on failure
      fetch(`${API_BASE}/api/board/default`)
        .then((res) => res.json())
        .then((data) => setBoard(data));
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">S</div>
          <h1 className="app-title">SignalFlow</h1>
        </div>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? "connected" : ""}`}></span>
          {isConnected ? "Connected (Real-time)" : "Connecting..."}
        </div>
      </header>

      <main className="board-container">
        {board?.columns.map((col) => {
          const isOver = draggedOverColumnId === col.id;
          return (
            <div
              key={col.id}
              className={`column ${isOver ? "drag-over" : ""}`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="column-header">
                <div className="column-title-wrapper">
                  <span className={`column-dot ${col.id}`}></span>
                  <h2 className="column-title">{col.name}</h2>
                </div>
                <span className="column-count">{col.tasks.length}</span>
              </div>

              <div className="task-list">
                {col.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`task-card ${draggedTaskId === task.id ? "dragging" : ""}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id, col.id)}
                  >
                    <div className="task-card-header">
                      <h3 className="task-title">{task.title}</h3>
                      <button
                        className="delete-task-btn"
                        onClick={() => handleDeleteTask(task.id)}
                        title="Delete Task"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    {task.description && <p className="task-desc">{task.description}</p>}
                  </div>
                ))}

                {activeFormColumnId === col.id ? (
                  <div className="task-form">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Task Title..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      autoFocus
                    />
                    <textarea
                      className="form-input form-textarea"
                      placeholder="Description (optional)..."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                    <div className="form-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setActiveFormColumnId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleCreateTask(col.id)}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="add-task-btn"
                    onClick={() => {
                      setActiveFormColumnId(col.id);
                      setNewTitle("");
                      setNewDesc("");
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginRight: "4px" }}
                    >
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add a card
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
