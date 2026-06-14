# SignalFlow

*Real‑time collaborative Kanban board built with .NET 8, SignalR, Next.js (TypeScript), and Docker.*

---

## 🌟 Overview
SignalFlow is a sleek, premium‑looking Kanban board that lets multiple users work together **in real time**.  It demonstrates modern full‑stack engineering:

- **Backend:** ASP.NET Core 8 Web API with **SignalR** for WebSocket communication and **SQLite** via Entity Framework Core.
- **Frontend:** Next.js (App Router) + TypeScript + vanilla CSS for a dark‑mode, glass‑morphic UI. The UI connects to SignalR using the `@microsoft/signalr` client.
- **Containerization:** Multi‑stage Docker builds for both services and a single `docker‑compose.yml` that ties everything together.

The project is deliberately lightweight so you can run it locally with a single command, yet it showcases production‑grade patterns (CORS, dependency injection, async EF Core, and clean architecture).

---

## ✨ Features
- **Real‑time sync** – drag‑and‑drop cards, create or delete tasks, and every change instantly appears on all connected browsers.
- **Dark‑mode UI** – custom CSS variables, smooth gradients, glass‑morphic cards, and micro‑animations.
- **Persisted data** – tasks are stored in a SQLite database (`kanban.db`).
- **Docker‑first** – one‑command local development and easy deployment.
- **Scalable architecture** – clear separation between models, data context, SignalR hub, and API endpoints.

---

## 🛠️ Tech Stack
| Layer | Technology |
|-------|------------|
| Backend | **C# / .NET 8** (ASP.NET Core), **SignalR**, **Entity Framework Core**, **SQLite** |
| Frontend | **Next.js 16** (App Router) – TypeScript, **@microsoft/signalr**, **Vanilla CSS** |
| Containerization | **Docker**, **Docker Compose** |
| CI/CD (optional) | GitHub Actions (build + test) |

---

## 🚀 Getting Started
### Prerequisites
- **Docker Desktop** (Windows) – includes Docker Engine and Compose.
- **Git** – for cloning the repo.
- (Optional) **Node.js** (if you want to run the frontend locally without Docker).

### Clone the repository
```bash
git clone https://github.com/Jivan2801/signalflow-kanban.git
cd signalflow-kanban
```

### Run with Docker Compose (recommended)
```bash
# From the project root
docker compose up --build
```
The compose file will:
1. Build the backend image (`backend`) and expose it on **http://localhost:5000**.
2. Build the Next.js frontend (`frontend`) and expose it on **http://localhost:3000**.
3. Persist the SQLite database in a Docker volume (`backend-db`).

Open two browser tabs at `http://localhost:3000` and watch the board synchronize instantly.

### Run locally (without Docker)
> Only needed for development or debugging.
```bash
# Backend (from backend/Kanban.API)
cd backend/Kanban.API
dotnet run   # will listen on http://localhost:5000

# Frontend (from frontend)
cd ../../frontend
npm install
npm run dev   # will start on http://localhost:3000
```
Make sure the `NEXT_PUBLIC_API_URL` env variable in the frontend points to `http://localhost:5000`.

---

## 📂 Project Structure
```
signalflow-kanban/
├── backend/                # ASP.NET Core API
│   └── Kanban.API/         # Project files (csproj, Program.cs, Models, Data, Hubs)
├── frontend/               # Next.js app
│   └── src/app/            # UI components & pages (page.tsx, globals.css, layout.tsx)
├── docker-compose.yml      # Orchestrates backend & frontend containers
├── .gitignore              # Ignores node_modules, .next, bin/obj, SQLite files
└── README.md               # You are reading it! 📝
```

---

## 🧪 Testing
The repository includes a few **xUnit** tests for the backend (located in `backend/Kanban.API.Tests` – you can add them later). To run the tests locally:
```bash
cd backend/Kanban.API
dotnet test
```
The frontend can be tested with **Jest**/React Testing Library (already set up by `create‑next‑app`).

---

## 🤝 Contributing
Contributions are welcome! Feel free to:
- Add more column types or custom fields.
- Implement authentication (e.g., ASP.NET Identity + NextAuth).
- Write integration tests for SignalR events.
- Polish the UI further (animations, dark‑mode toggle, etc.).

1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/awesome‑thing`).
3. Commit your changes with clear messages.
4. Open a Pull Request.

---

## 📜 License
This project is released under the **MIT License** – see the `LICENSE` file for details.

---

## 🙏 Acknowledgements
- **Microsoft Semantic Kernel** – inspiration for agentic pipelines.
- **Next.js** – for its powerful App Router & zero‑config TypeScript support.
- **Tailwind CSS** (initially scaffolded, but we switched to vanilla CSS for full design control).

---

### 🎉 Ready to board?
Run `docker compose up --build` and start moving tasks in real‑time. Happy coding!
