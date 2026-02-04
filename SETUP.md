# 🚀 Rust Rush - Setup Guide

This guide will help you get all three components of Rust Rush running on your local machine.

## 📋 Prerequisites

Make sure you have these installed:
- **Rust** 1.75+ → [rustup.rs](https://rustup.rs/)
- **Go** 1.21+ → [go.dev/dl](https://go.dev/dl/)
- **Node.js** 18+ → [nodejs.org](https://nodejs.org/)
- **PostgreSQL** 15+ → [postgresql.org](https://www.postgresql.org/download/)

Verify installations:
```bash
rust --version
cargo --version
go version
node --version
npm --version
psql --version
```

---

## 🗄️ Database Setup

### 1. Create Database
```bash
# On Windows (PowerShell)
& 'C:\Program Files\PostgreSQL\15\bin\createdb.exe' rustrush

# On macOS/Linux
createdb rustrush
```

### 2. Run Schema
```bash
psql rustrush < database/schema.sql
```

### 3. Verify Database
```bash
psql rustrush
# Inside psql:
\dt  # List tables
\q   # Quit
```

---

## 🦀 Rust Game Engine Setup

### 1. Navigate to Game Engine
```bash
cd game-engine
```

### 2. Build the Project
```bash
cargo build
```

### 3. Run Tests
```bash
cargo test
```

### 4. Run the Engine (Hello World)
```bash
cargo run
```

You should see output like:
```
Rust Rush Game Engine
=====================
Created game grid: 20x15
Added tower with ID: 1
Spawned enemy with ID: 1
...
```

### 5. Optional: Run in Release Mode
```bash
cargo build --release
cargo run --release
```

---

## 🐹 Go WebSocket Server Setup

### 1. Navigate to Server
```bash
cd server
```

### 2. Install Dependencies
```bash
go mod download
go mod tidy
```

### 3. Create .env File
```bash
# Copy example
cp .env.example .env

# Edit .env with your database credentials
# Windows: notepad .env
# Mac/Linux: nano .env
```

Example `.env`:
```env
PORT=8080
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/rustrush?sslmode=disable
ALLOWED_ORIGINS=http://localhost:5173
```

### 4. Run the Server
```bash
go run cmd/main.go
```

You should see:
```
Server starting on port 8080
```

### 5. Test Health Endpoint
Open browser to: `http://localhost:8080/health`

Should return:
```json
{"status": "healthy"}
```

---

## ⚛️ React Client Setup

### 1. Navigate to Client
```bash
cd client
```

### 2. Install Dependencies
```bash
npm install
```

This will take a few minutes to download all packages.

### 3. Run Development Server
```bash
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### 4. Open in Browser
Navigate to: `http://localhost:5173`

You should see:
- **Rust Rush** header
- A 20x15 grid
- Gold, Health, and Wave counters
- Start Wave and Pause buttons

### 5. Test Interactivity
- Hover over grid cells (they should highlight)
- Click a cell (check browser console for logs)

---

## 🎮 Running Everything Together

### Terminal 1: Rust Engine
```bash
cd game-engine
cargo run
```

### Terminal 2: Go Server
```bash
cd server
go run cmd/main.go
```

### Terminal 3: React Client
```bash
cd client
npm run dev
```

Open browser to `http://localhost:5173` and you should have a working foundation!

---

## 🧪 Verify Everything Works

### 1. Rust Tests
```bash
cd game-engine
cargo test
```
Should show: **test result: ok. 5 passed; 0 failed**

### 2. Go Server Health
```bash
curl http://localhost:8080/health
```
Should return: `{"status": "healthy"}`

### 3. React Build
```bash
cd client
npm run build
```
Should create `dist/` folder without errors

---

## 🐛 Common Issues

### Issue: "cargo not found"
**Solution**: Install Rust from [rustup.rs](https://rustup.rs/)

### Issue: "go: command not found"
**Solution**: Install Go from [go.dev](https://go.dev/dl/) and add to PATH

### Issue: "createdb: command not found"
**Solution**: Add PostgreSQL bin to PATH:
```bash
# Windows: Add to Path: C:\Program Files\PostgreSQL\15\bin
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql
```

### Issue: "connection refused" on port 8080
**Solution**: Make sure Go server is running: `go run cmd/main.go`

### Issue: React shows blank page
**Solution**: 
1. Check browser console for errors (F12)
2. Make sure `npm install` completed successfully
3. Try `npm run dev` again

### Issue: PostgreSQL authentication failed
**Solution**: Update `.env` with correct password:
```env
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/rustrush?sslmode=disable
```

---

## 📁 Project Structure

```
rust-rush/
├── game-engine/          # Rust game logic ✅ SET UP
│   ├── src/
│   │   └── main.rs       # Game state, towers, enemies
│   └── Cargo.toml
├── server/               # Go WebSocket server ✅ SET UP
│   ├── cmd/
│   │   └── main.go       # Server entry point
│   ├── internal/
│   │   ├── game/         # Game room management
│   │   └── websocket/    # WebSocket handlers
│   └── go.mod
├── client/               # React frontend ✅ SET UP
│   ├── src/
│   │   ├── App.tsx       # Main app component
│   │   └── game/
│   │       └── GameCanvas.tsx  # Canvas rendering
│   └── package.json
└── database/
    └── schema.sql        # Database schema
```

---

## ✅ Next Steps

Now that everything is set up, you're ready to:

1. ✅ **Phase 1 Complete**: Project structure initialized
2. 🎯 **Next**: Implement A* pathfinding in Rust
3. 🎯 **Then**: Connect WebSocket communication
4. 🎯 **Then**: Add tower placement in React

Check the [TODO.md](../TODO.md) for the full roadmap!

---

## 🆘 Need Help?

If you're stuck:
1. Check error messages carefully
2. Verify all prerequisites are installed
3. Make sure you're in the correct directory
4. Try restarting all three services

Happy coding! 🦀🐹⚛️
