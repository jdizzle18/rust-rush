# 🦀 Rust Rush - Tower Defense Game

A high-performance tower defense game showcasing Rust's computational power, Go's concurrency, and modern web technologies.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Rust](https://img.shields.io/badge/rust-1.75+-orange.svg)
![Go](https://img.shields.io/badge/go-1.21+-00ADD8.svg)
![React](https://img.shields.io/badge/react-18+-61DAFB.svg)
## 🎮 Features

### Currently Implemented
- ✅ **Interactive Tower Placement** - Click to place 4 different tower types
- ✅ **Smart Enemy Pathfinding** - Enemies use A* algorithm to navigate around towers
- ✅ **Real-time Animation** - Smooth 60 FPS enemy movement
- ✅ **Dynamic Path Recalculation** - Enemies reroute when towers are placed
- ✅ **WebSocket Communication** - Real-time updates between client and server
- ✅ **Tower Types**: Basic, Sniper, Splash, Slow
- ✅ **Pause/Resume** - Control game speed
- ✅ **Path Blocking Detection** - Prevents spawning when path is blocked

### In Development
- 🚧 Tower shooting mechanics
- 🚧 Enemy damage and death
- 🚧 Wave system
- 🚧 Gold and resource management
- 🚧 Victory/defeat conditions

## 🏗️ Architecture
```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   React     │ ◄──────►│   Go        │ ◄──────►│   Rust      │
│   Client    │         │   Server    │         │   Engine    │
│             │         │             │         │             │
│  - Canvas   │         │ - WebSocket │         │ - A* Path   │
│  - UI       │         │ - Rooms     │         │ - Game      │
│  - 60 FPS   │         │ - Hub       │         │   Logic     │
└─────────────┘         └─────────────┘         └─────────────┘
```

## 🚀 Getting Started

### Prerequisites
- **Rust** (1.70+): https://rustup.rs
- **Go** (1.21+): https://go.dev/dl/
- **Node.js** (18+): https://nodejs.org
- **PostgreSQL** (16+): https://postgresql.org

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/jdizzle18/rust-rush.git
cd rust-rush
```

2. **Set up the database**
```bash
createdb -U postgres rustrush
psql -U postgres rustrush -f database/schema.sql
```

3. **Configure environment**
```bash
cd server
cp .env.example .env
# Edit .env with your database credentials
```

4. **Install dependencies**
```bash
# Go server
cd server
go mod download

# React client
cd ../client
npm install
```

### Running the Game

**Terminal 1 - Rust Engine** (optional for now):
```bash
cd game-engine
cargo run
```

**Terminal 2 - Go Server**:
```bash
cd server
go run cmd/main.go
```

**Terminal 3 - React Client**:
```bash
cd client
npm run dev
```

Open http://localhost:5173 in your browser!

## 🎯 How to Play

1. **Place Towers** - Select a tower type and click on the grid
2. **Spawn Enemies** - Click "🦀 Spawn Test Enemy" to test pathfinding
3. **Watch Them Navigate** - Enemies use A* to find paths around towers
4. **Block Their Path** - Surround enemies to trap them
5. **Pause** - Use pause/resume to control the action

### Tower Types

| Tower   | Cost | Range | Damage | Fire Rate | Best For           |
|---------|------|-------|--------|-----------|-------------------|
| 🗼 Basic  | $50  | 3.0   | 10     | 1.0/sec   | All-around defense |
| 🎯 Sniper | $100 | 6.0   | 50     | 0.3/sec   | Long-range, high damage |
| 💥 Splash | $75  | 2.5   | 15     | 0.8/sec   | Area damage |
| ❄️ Slow   | $60  | 3.5   | 5      | 2.0/sec   | Slowing enemies |

### Controls

- **Left Click** - Place selected tower
- **Hover** - Preview tower range
- **Pause Button** - Pause/resume game
- **Clear All** - Remove all towers and enemies

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Canvas API** for rendering
- **WebSocket** for real-time updates
- **Vite** for fast development

### Backend
- **Go 1.21** with Gorilla WebSocket
- **Room-based multiplayer** support
- **Message broadcasting** system

### Game Engine
- **Rust** for game logic
- **A* pathfinding** algorithm
- **Serde** for serialization
- **Comprehensive unit tests**

### Database
- **PostgreSQL** for persistence
- Game state storage
- User data (future)

## 📂 Project Structure
```
rust-rush/
├── game-engine/          # Rust game logic
│   ├── src/
│   │   ├── main.rs       # Game structs and logic
│   │   └── pathfinding.rs # A* algorithm
│   └── Cargo.toml
├── server/               # Go WebSocket server
│   ├── cmd/main.go       # Server entry point
│   └── internal/
│       ├── game/         # Game state management
│       └── websocket/    # WebSocket handlers
├── client/               # React frontend
│   ├── src/
│   │   ├── App.tsx       # Main app component
│   │   ├── game/
│   │   │   └── GameCanvas.tsx  # Canvas rendering
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts # WebSocket hook
│   │   └── types/
│   │       └── game.ts   # TypeScript types
│   └── package.json
└── database/
    └── schema.sql        # Database schema
```

## 🧪 Testing

### Rust Tests
```bash
cd game-engine
cargo test
```

**Expected output**: 17 tests passing
- Unit tests for pathfinding
- Game state tests
- Grid manipulation tests

### Manual Testing Checklist
- [ ] Place all 4 tower types
- [ ] Spawn multiple enemies
- [ ] Enemies navigate around towers
- [ ] Place tower while enemy is moving (path recalculates)
- [ ] Block path completely (spawn fails with alert)
- [ ] Pause/resume works
- [ ] Clear all removes everything
- [ ] Hover shows tower range

## 🐛 Known Issues

- Towers don't shoot yet (in development)
- Enemies don't take damage (in development)
- "Start Wave" button not functional (in development)
- Gold/health don't update (in development)

## 🤝 Contributing

This is a personal learning project, but feedback is welcome!

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- A* pathfinding algorithm
- Gorilla WebSocket library
- React + Vite for smooth development
- The Rust community for excellent documentation

## 📧 Contact

**Jaime De La Paz**
- GitHub: [@jaime-builds](https://github.com/jaime-builds)
- Project Link: [https://github.com/jaime-builds/movie-analytics-dashboard](https://github.com/jaime-builds/rust-rush)

---

**Built with** 🦀 Rust, 🐹 Go, and ⚛️ React
