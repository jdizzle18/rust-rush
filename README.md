# 🦀 Rust Rush - Tower Defense Game

A high-performance tower defense game showcasing Go's concurrency, modern web technologies, and real-time gameplay.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go](https://img.shields.io/badge/go-1.21+-00ADD8.svg)
![React](https://img.shields.io/badge/react-18+-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0+-3178C6.svg)

## 🎮 Features

### ✅ Fully Implemented (MVP Complete!)

#### Core Gameplay
- **Interactive Tower Placement** - Click to place 4 different tower types on a 20×15 grid
- **Automatic Tower Shooting** - Towers detect, rotate, and shoot at enemies within range
- **Smart Enemy Pathfinding** - Enemies use BFS algorithm to navigate around towers
- **Real-time Animation** - Smooth 60 FPS rendering on both server and client
- **Dynamic Path Recalculation** - Enemies instantly reroute when towers are placed mid-wave
- **Health & Damage System** - Enemies take damage, die, and award gold
- **Resource Management** - Gold system with rewards for kills

#### Visual Effects
- **Projectile System** - Bullets with glowing trails fly toward enemies
- **Muzzle Flashes** - 100ms flash effect when towers shoot
- **Explosion Effects** - 300ms animated explosions on projectile hit
- **Health Bars** - Real-time health visualization above enemies
- **Tower Rotation** - Towers visually rotate to face their targets
- **Range Indicators** - Red circles show tower attack range when active

#### Technical Features
- **Server-Authoritative Architecture** - All game logic runs on Go server (anti-cheat)
- **60 FPS Game Loop** - Smooth server-side updates at 60 frames per second
- **WebSocket Communication** - Real-time bidirectional updates
- **Room-Based Multiplayer** - Infrastructure ready for multi-player games
- **Debug System** - Toggleable panel showing tower stats, enemy health, and performance

### Tower Types

| Tower    | Cost | Range | Damage | Fire Rate | Speed  | Best For               |
|----------|------|-------|--------|-----------|--------|------------------------|
| 🗼 Basic  | $50  | 3.0   | 15     | 1.0/sec   | 8.0    | All-around defense     |
| 🎯 Sniper | $100 | 6.0   | 50     | 0.5/sec   | 12.0   | Long-range, high damage|
| 💥 Splash | $75  | 2.5   | 10     | 1.5/sec   | 8.0    | Fast firing            |
| ❄️ Slow   | $60  | 3.5   | 8      | 0.8/sec   | 8.0    | Consistent damage      |

### Enemy Types (Currently)

| Type     | Health | Speed | Gold | Description            |
|----------|--------|-------|------|------------------------|
| 🦀 Basic  | 100    | 2.0   | +10  | Standard enemy         |

*(More enemy types planned for future phases)*

### 🚧 In Development
- Wave system (spawn multiple enemies automatically)
- Additional enemy types (fast, tank, flying, boss)
- Tower upgrades (3 levels per tower)
- Victory/defeat screens
- Sound effects and music

## 🏗️ Architecture

### Server-Authoritative Design
```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React)                          │
│  - Renders game state                                       │
│  - Sends user inputs                                        │
│  - 60 FPS animation loop                                    │
│  - NO game logic                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket (60 msgs/sec)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                     SERVER (Go)                              │
│  - 60 FPS game loop                                         │
│  - Tower targeting & shooting                               │
│  - Projectile physics                                       │
│  - Enemy movement                                           │
│  - BFS pathfinding                                          │
│  - Damage calculations                                      │
│  - Authoritative state                                      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow
```
Player clicks → Client sends "place_tower" → Server validates → 
Server adds tower → Server recalculates enemy paths → 
Server broadcasts new state → Client renders
```

## 🚀 Getting Started

### Prerequisites
- **Go** (1.21+): https://go.dev/dl/
- **Node.js** (18+): https://nodejs.org
- **PostgreSQL** (16+): https://postgresql.org *(optional for persistence)*

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/jdizzle18/rust-rush.git
cd rust-rush
```

2. **Start the Go server**
```bash
cd server
go mod download
go run cmd/main.go
```
Server starts on `http://localhost:8080`

3. **Start the React client** (in a new terminal)
```bash
cd client
npm install
npm run dev
```
Client starts on `http://localhost:5173`

4. **Play the game!**
Open http://localhost:5173 in your browser

## 🎯 How to Play

### Basic Controls
1. **Select a Tower** - Click one of the 4 tower buttons at the top
2. **Place Tower** - Click on the grid to place (costs gold)
3. **Spawn Enemy** - Click "🦀 Spawn Test Enemy" button
4. **Watch the Action** - Towers automatically shoot enemies in range!

### Advanced Tactics
- **Create Mazes** - Force enemies to take longer paths
- **Cover Choke Points** - Place towers where paths converge
- **Block Completely** - Surround enemies to trap them
- **Use Debug Mode** - Click "🐛 Show Debug" to see tower stats

### Game Mechanics
- **Towers** rotate to face their targets in real-time
- **Projectiles** travel toward enemies (not instant hit)
- **Enemies** die when health reaches 0
- **Gold** increases by +10 for each kill
- **Health** decreases by -10 when enemies reach goal
- **Paths** recalculate instantly when towers are placed

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **HTML5 Canvas** for game rendering
- **WebSocket** for real-time communication
- **Vite** for blazing-fast development
- **CSS3** for UI styling

### Backend
- **Go 1.21+** for game server
- **Gorilla WebSocket** for real-time connections
- **Server-side game loop** at 60 FPS
- **Room-based architecture** for multiplayer support

### Algorithms
- **BFS Pathfinding** - Breadth-first search for optimal paths
- **Manhattan Distance** - Heuristic for pathfinding
- **Delta-time Movement** - Frame-rate independent physics
- **Collision Detection** - Circle-based hit detection

### Database (Optional)
- **PostgreSQL** for game state persistence
- User accounts (future feature)
- Leaderboards (future feature)

## 📂 Project Structure
```
rust-rush/
├── server/                    # Go backend
│   ├── cmd/
│   │   └── main.go           # Server entry point
│   └── internal/
│       ├── game/
│       │   ├── state.go      # Game state with shooting mechanics
│       │   └── manager.go    # Game loop & room management
│       └── websocket/
│           ├── hub.go        # WebSocket broadcast hub
│           └── client.go     # Client connection handler
├── client/                    # React frontend
│   ├── src/
│   │   ├── App.tsx           # Main app with debug panel
│   │   ├── game/
│   │   │   └── GameCanvas.tsx # Canvas rendering engine
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts # WebSocket custom hook
│   │   └── types/
│   │       └── game.ts       # TypeScript type definitions
│   └── package.json
├── database/                  # PostgreSQL schemas (optional)
│   └── schema.sql
└── docs/
    ├── TODO.md               # Development roadmap
    └── ARCHITECTURE.md       # System design docs
```

## 🎮 Gameplay Screenshots

### Main Game
```
┌────────────────────────────────────────────────────┐
│  🦀 Rust Rush - Tower Defense                      │
│  ● Connected    🐛 Show Debug                      │
├────────────────────────────────────────────────────┤
│  💰 Gold: 250   ❤️ Health: 90   🌊 Wave: 1         │
│  🔌 Server: Connected                              │
├────────────────────────────────────────────────────┤
│  🗼 Basic $50  🎯 Sniper $100  💥 Splash $75       │
│  ❄️ Slow $60                                       │
├────────────────────────────────────────────────────┤
│                                                    │
│         [Grid with towers shooting enemies]       │
│                                                    │
│  S ──→ ──→ 🗼 ──→ 🦀💥──→ 🎯 ──→ ──→ G           │
│                   ↑                                │
│                  💥 Explosion!                     │
│                                                    │
├────────────────────────────────────────────────────┤
│  [Start Wave] [🦀 Spawn Test Enemy] [Clear All]   │
├────────────────────────────────────────────────────┤
│  Towers: 3 | Enemies: 2 | Projectiles: 5          │
│  💡 Towers will automatically shoot enemies!       │
└────────────────────────────────────────────────────┘
```

### Debug Mode (Optional)
```
┌─────────────────────────────────────────────────────┐
│ 📊 Game State     🗼 Towers (3)      🦀 Enemies (2) │
│ 🗼 Towers: 3      #1 basic          #1: 85/100     │
│ 🦀 Enemies: 2     Rot: 1.57         #2: 100/100    │
│ 💥 Projectiles: 5 CD: 0.45                         │
│ 💰 Gold: 250      Target: 2                        │
│ ❤️ Health: 90     #2 sniper                        │
│                   Rot: -0.78                       │
│                   CD: 1.23                         │
│                   Target: None                     │
└─────────────────────────────────────────────────────┘
```

## 🧪 Testing

### Server Tests
```bash
cd server
go test ./...
```

### Manual Testing Checklist
- [x] Place all 4 tower types
- [x] Spawn multiple enemies
- [x] Towers rotate to face enemies
- [x] Projectiles fly toward targets
- [x] Enemies take damage and die
- [x] Dead enemies disappear immediately
- [x] Gold increases on kills
- [x] Health decreases when enemies reach goal
- [x] Place tower mid-wave (enemies reroute)
- [x] Block path completely (enemies stop)
- [x] All towers shoot (not just first one)
- [x] Debug panel toggles on/off
- [x] Connection status shows green when connected

## 🐛 Known Issues & Limitations

### Current Limitations
- Only one enemy type (basic)
- No wave system yet (manual spawn only)
- No tower selling/upgrading
- No sound effects
- Single-player only (multiplayer infrastructure ready but not implemented)

### Performance
- Tested with 20+ towers, 10+ enemies at 60 FPS ✅
- WebSocket sends ~60 messages/second (may need optimization for large games)
- BFS pathfinding runs when tower placed (instant for 20×15 grid)

## 🚀 Future Plans

### Short Term (Next 2-4 Weeks)
- [ ] Wave system (automatic enemy spawning)
- [ ] Multiple enemy types (fast, tank, flying, boss)
- [ ] Tower upgrades (levels 1-3)
- [ ] Better UI/UX polish
- [ ] Sound effects

### Medium Term (1-2 Months)
- [ ] Multiplayer lobby system
- [ ] User accounts & authentication
- [ ] Leaderboards
- [ ] More tower types (freeze, tesla, mortar)
- [ ] Map variety

### Long Term (3+ Months)
- [ ] Mobile version (React Native)
- [ ] Achievements system
- [ ] Tutorial/campaign mode
- [ ] Map editor
- [ ] Steam release consideration

## 🤝 Contributing

This is a personal learning project, but feedback and suggestions are welcome! Feel free to:
- Open issues for bugs
- Suggest features
- Ask questions about the architecture
- Share your high scores!

## 📝 Development Notes

### What I Learned
- **Server-authoritative architecture** prevents cheating but requires careful state management
- **60 FPS game loops** need efficient algorithms to avoid lag
- **WebSocket broadcasting** at high frequency requires optimization
- **Real-time pathfinding** during gameplay is possible with BFS on small grids
- **React + Canvas** works great for game rendering with proper state management

### Technical Challenges Solved
1. **Syncing client/server state** - Server is authoritative, client just renders
2. **Smooth enemy movement** - Server controls position, client interpolates
3. **Tower rotation** - Server calculates angle using atan2, client renders
4. **Dynamic pathfinding** - BFS runs when tower placed, all enemies reroute
5. **Projectile physics** - Server moves projectiles, checks collision, broadcasts

## 📜 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- **Gorilla WebSocket** - Excellent Go WebSocket library
- **React + Vite** - Amazing developer experience
- **BFS Algorithm** - Simple and effective pathfinding
- **Tower Defense Genre** - Inspired by classics like Bloons TD and Kingdom Rush

## 📧 Contact

**Jaime De La Paz**
- GitHub: [@jaime-builds](https://github.com/jaime-builds)
- Project Link: [https://github.com/jaime-builds/movie-analytics-dashboard](https://github.com/jaime-builds/rust-rush)

---

**Built with** 🐹 Go and ⚛️ React | **Status**: MVP Complete! 🎉 | **Last Updated**: February 5, 2026