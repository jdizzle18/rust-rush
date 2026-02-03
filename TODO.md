# TODO - Rust Rush

## Completed ✅
- [✅] Project initialization and planning
- [✅] README and documentation

## In Progress 🚧
- [ ] Database schema design
- [ ] Project structure setup

## Phase 1: Foundation (Week 1-2)

### Rust Game Engine
- [ ] Set up Cargo project structure
- [ ] Implement basic grid/map system (2D array)
- [ ] Create Tower struct (position, range, damage, fire_rate)
- [ ] Create Enemy struct (position, health, speed, path)
- [ ] Implement A* pathfinding algorithm
- [ ] Write unit tests for pathfinding
- [ ] Game loop and tick system
- [ ] Collision detection (towers blocking paths)

### Go WebSocket Server
- [ ] Initialize Go modules and project structure
- [ ] Set up PostgreSQL connection pool
- [ ] Create WebSocket handler for game connections
- [ ] Implement game room management
- [ ] Message routing (client → Rust engine → client)
- [ ] Basic authentication middleware
- [ ] Health check endpoint

### Database
- [ ] Create PostgreSQL database schema
- [ ] Write migration scripts
- [ ] Set up connection pooling
- [ ] Create seed data for testing
- [ ] Index optimization for leaderboards

### React Frontend
- [ ] Initialize Vite + React + TypeScript project
- [ ] Set up Redux Toolkit for state management
- [ ] Create Canvas component for game rendering
- [ ] Implement grid rendering (draw map)
- [ ] WebSocket connection hook
- [ ] Basic UI layout (header, sidebar, game area)

## Phase 2: Core Gameplay (Week 3-4)

### Game Mechanics
- [ ] Tower placement logic (click to place)
- [ ] Tower removal/refund system
- [ ] Gold/currency system
- [ ] Enemy spawning system
- [ ] Enemy movement along path
- [ ] Tower targeting and shooting
- [ ] Damage calculation
- [ ] Health system (player base health)
- [ ] Wave progression system

### UI Components
- [ ] Tower selection menu
- [ ] Gold counter display
- [ ] Wave counter display
- [ ] Health bar for player base
- [ ] Tower info panel (on hover/select)
- [ ] Game over screen
- [ ] Victory screen
- [ ] Start/pause/restart buttons

### Visual Polish
- [ ] Tower sprites/icons
- [ ] Enemy sprites
- [ ] Projectile animations
- [ ] Health bars for enemies
- [ ] Range indicators for towers
- [ ] Grid highlighting on hover
- [ ] Smooth camera transitions

## Phase 3: Content Expansion (Week 5-6)

### Tower Types
- [ ] Basic Tower (balanced)
- [ ] Sniper Tower (long range, slow fire)
- [ ] Splash Tower (AOE damage)
- [ ] Slow Tower (reduces enemy speed)
- [ ] Tower upgrade system (3 levels each)
- [ ] Unique tower abilities

### Enemy Variety
- [ ] Basic Enemy (slow, low health)
- [ ] Fast Enemy (quick, low health)
- [ ] Tank Enemy (slow, high health)
- [ ] Flying Enemy (ignores ground towers)
- [ ] Boss Enemy (end of wave, high health)

### Wave System
- [ ] Configure 20 waves with increasing difficulty
- [ ] Boss waves (every 5 waves)
- [ ] Dynamic difficulty scaling
- [ ] Wave preview (show next wave composition)
- [ ] Reward scaling per wave

### Sound & Effects
- [ ] Background music
- [ ] Tower shooting sound effects
- [ ] Enemy death effects
- [ ] Wave start/complete jingles
- [ ] UI click sounds
- [ ] Volume controls

## Phase 4: Persistence & Features (Week 7-8)

### User System
- [ ] User registration
- [ ] Login/logout
- [ ] JWT authentication
- [ ] Password hashing (bcrypt)
- [ ] Session management

### Game Persistence
- [ ] Save game state to database
- [ ] Load saved games
- [ ] Auto-save every 30 seconds
- [ ] Game history tracking
- [ ] Statistics per player

### Leaderboards
- [ ] High score leaderboard (top 100)
- [ ] Most waves completed
- [ ] Fastest completion time
- [ ] Most efficient (least towers used)
- [ ] Daily/weekly/all-time rankings

### Achievements
- [ ] First blood (kill first enemy)
- [ ] Wave warrior (complete wave 10)
- [ ] Tower master (build 50 towers)
- [ ] Perfectionist (complete game without losing health)
- [ ] Minimalist (complete wave with <5 towers)
- [ ] Rich (accumulate 10,000 gold)
- [ ] Display achievements on profile page

## Phase 5: Advanced Features (Week 9-10)

### Analytics Dashboard
- [ ] Player statistics page
- [ ] Game history visualization
- [ ] Win/loss ratio charts
- [ ] Tower usage analytics
- [ ] Most successful tower combinations

### Multiplayer (Optional)
- [ ] Co-op mode (2 players, shared map)
- [ ] Competitive mode (parallel maps, race)
- [ ] Game lobbies
- [ ] In-game chat
- [ ] Friend system

### Polish & Optimization
- [ ] Mobile responsive design
- [ ] Touch controls for tower placement
- [ ] Performance optimization (FPS monitoring)
- [ ] Memory leak detection and fixes
- [ ] Loading screens with tips
- [ ] Tutorial/onboarding flow

## Testing & Quality

### Unit Tests
- [ ] Rust: pathfinding tests
- [ ] Rust: game logic tests
- [ ] Go: API endpoint tests
- [ ] Go: WebSocket tests
- [ ] React: component tests

### Integration Tests
- [ ] End-to-end game flow
- [ ] WebSocket communication
- [ ] Database operations
- [ ] Authentication flow

### Performance Testing
- [ ] Load test WebSocket server (100+ concurrent games)
- [ ] Profile Rust game engine
- [ ] Frontend FPS benchmarks
- [ ] Database query optimization

## Deployment

### Infrastructure
- [ ] Docker containerization
  - [ ] Rust engine container
  - [ ] Go server container
  - [ ] React build container
  - [ ] PostgreSQL container
- [ ] Docker Compose setup
- [ ] Environment variable management
- [ ] CI/CD pipeline (GitHub Actions)

### Hosting
- [ ] Deploy to Railway/Render (backend)
- [ ] Deploy to Vercel/Netlify (frontend)
- [ ] Configure PostgreSQL (Supabase/Railway)
- [ ] Set up CDN for static assets
- [ ] Configure WebSocket proxy
- [ ] SSL/TLS certificates

### Monitoring
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] WebSocket connection health checks
- [ ] Database query monitoring
- [ ] User analytics (optional)

## Documentation

- [ ] API documentation (Go server endpoints)
- [ ] Code documentation (inline comments)
- [ ] Architecture diagrams
- [ ] Setup guide for contributors
- [ ] Game design document
- [ ] Performance benchmarks document

## Nice-to-Have Features

- [ ] Map editor (custom tower placement restrictions)
- [ ] Replay system (watch previous games)
- [ ] Spectator mode
- [ ] Tower skins/themes
- [ ] Seasonal events
- [ ] Daily challenges
- [ ] Twitch integration for streaming
- [ ] Discord bot for leaderboards

---

## Current Sprint Priority

**This Week:**
1. Set up all three project folders (Rust, Go, React)
2. Initialize PostgreSQL database
3. Create basic grid rendering in React
4. Implement A* pathfinding in Rust
5. Set up WebSocket connection between client and server

**Blocked:**
- None currently

**Questions:**
- Should we use WebGL instead of Canvas for better performance?
- Fixed map size or procedurally generated maps?
- Should towers have line-of-sight requirements?
