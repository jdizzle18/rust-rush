package game

import (
	"fmt"
	"math"
	"sync"
)

// Position represents a 2D coordinate
type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// Tower represents a defensive structure
type Tower struct {
	ID            int      `json:"id"`
	Position      Position `json:"position"`
	TowerType     string   `json:"tower_type"`
	Level         int      `json:"level"`
	Range         float64  `json:"range"`
	Damage        float64  `json:"damage"`
	FireRate      float64  `json:"fire_rate"`                // shots per second
	Cooldown      float64  `json:"cooldown"`                 // time until next shot
	Rotation      float64  `json:"rotation"`                 // radians, for rendering
	CurrentTarget int      `json:"current_target,omitempty"` // enemy ID being targeted
}

// Enemy represents a hostile unit
type Enemy struct {
	ID        int        `json:"id"`
	Position  Position   `json:"position"`
	EnemyType string     `json:"enemy_type"`
	Health    float64    `json:"health"`
	MaxHealth float64    `json:"max_health"`
	Speed     float64    `json:"speed"`
	Path      []Position `json:"path,omitempty"`
	PathIndex int        `json:"path_index"`
}

// Projectile represents a bullet/missile
type Projectile struct {
	ID       int      `json:"id"`
	Position Position `json:"position"`
	TargetID int      `json:"target_id"` // enemy ID
	Speed    float64  `json:"speed"`
	Damage   float64  `json:"damage"`
	TowerID  int      `json:"tower_id"`
}

// MuzzleFlash represents a visual effect when tower shoots
type MuzzleFlash struct {
	ID       int      `json:"id"`
	Position Position `json:"position"`
	Duration float64  `json:"duration"` // seconds remaining
}

// Explosion represents a visual effect when projectile hits
type Explosion struct {
	ID       int      `json:"id"`
	Position Position `json:"position"`
	Duration float64  `json:"duration"` // seconds remaining
	Radius   float64  `json:"radius"`
}

// GameStateWithShooting extends GameState with shooting mechanics
type GameStateWithShooting struct {
	RoomID           string        `json:"room_id"`
	Players          []string      `json:"players"`
	Towers           []Tower       `json:"towers"`
	Enemies          []Enemy       `json:"enemies"`
	Projectiles      []Projectile  `json:"projectiles"`
	MuzzleFlashes    []MuzzleFlash `json:"muzzle_flashes"`
	Explosions       []Explosion   `json:"explosions"`
	Gold             int           `json:"gold"`
	Health           int           `json:"health"`
	Wave             int           `json:"wave"`
	GameTime         float64       `json:"game_time"`
	SpawnPoint       *Position     `json:"spawn_point,omitempty"`
	GoalPoint        *Position     `json:"goal_point,omitempty"`
	mu               sync.RWMutex
	nextTowerID      int
	nextEnemyID      int
	nextProjectileID int
	nextEffectID     int
}

// NewGameStateWithShooting creates a new game state
func NewGameStateWithShooting(roomID string) *GameStateWithShooting {
	return &GameStateWithShooting{
		RoomID:           roomID,
		Players:          make([]string, 0),
		Towers:           make([]Tower, 0),
		Enemies:          make([]Enemy, 0),
		Projectiles:      make([]Projectile, 0),
		MuzzleFlashes:    make([]MuzzleFlash, 0),
		Explosions:       make([]Explosion, 0),
		Gold:             200,
		Health:           100,
		Wave:             1,
		GameTime:         0,
		nextTowerID:      1,
		nextEnemyID:      1,
		nextProjectileID: 1,
		nextEffectID:     1,
	}
}

// Update runs game logic for one frame (60 FPS = ~16.67ms per frame)
func (gs *GameStateWithShooting) Update(deltaTime float64) {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	gs.GameTime += deltaTime

	// Update towers (cooldowns, targeting, shooting)
	gs.updateTowers(deltaTime)

	// Update projectiles (movement, collision)
	gs.updateProjectiles(deltaTime)

	// Update enemies (movement, health)
	gs.updateEnemies(deltaTime)

	// Update visual effects (decay)
	gs.updateEffects(deltaTime)
}

// updateTowers handles tower logic
func (gs *GameStateWithShooting) updateTowers(deltaTime float64) {
	for i := range gs.Towers {
		tower := &gs.Towers[i]

		// Reduce cooldown
		if tower.Cooldown > 0 {
			tower.Cooldown -= deltaTime
		}

		// Find target
		target := gs.findNearestEnemy(tower.Position, tower.Range)
		if target == nil {
			tower.CurrentTarget = 0
			continue
		}

		tower.CurrentTarget = target.ID

		// Update rotation to face target
		dx := target.Position.X - tower.Position.X
		dy := target.Position.Y - tower.Position.Y
		tower.Rotation = math.Atan2(dy, dx)

		// Shoot if ready
		if tower.Cooldown <= 0 {
			gs.shootProjectile(tower, target)
			tower.Cooldown = 1.0 / tower.FireRate

			// Create muzzle flash effect
			gs.MuzzleFlashes = append(gs.MuzzleFlashes, MuzzleFlash{
				ID:       gs.nextEffectID,
				Position: tower.Position,
				Duration: 0.1, // 100ms flash
			})
			gs.nextEffectID++
		}
	}
}

// findNearestEnemy finds the closest enemy within range
func (gs *GameStateWithShooting) findNearestEnemy(pos Position, maxRange float64) *Enemy {
	var nearest *Enemy
	minDist := math.MaxFloat64

	for i := range gs.Enemies {
		enemy := &gs.Enemies[i]
		dist := distance(pos, enemy.Position)

		if dist <= maxRange && dist < minDist {
			minDist = dist
			nearest = enemy
		}
	}

	return nearest
}

// shootProjectile creates a new projectile
func (gs *GameStateWithShooting) shootProjectile(tower *Tower, target *Enemy) {
	// Projectile speed based on tower type
	speed := 8.0 // cells per second
	if tower.TowerType == "sniper" {
		speed = 12.0
	}

	projectile := Projectile{
		ID:       gs.nextProjectileID,
		Position: tower.Position,
		TargetID: target.ID,
		Speed:    speed,
		Damage:   tower.Damage,
		TowerID:  tower.ID,
	}

	gs.Projectiles = append(gs.Projectiles, projectile)
	gs.nextProjectileID++
}

// updateProjectiles moves projectiles and checks collisions
func (gs *GameStateWithShooting) updateProjectiles(deltaTime float64) {
	activeProjectiles := make([]Projectile, 0)

	for i := range gs.Projectiles {
		proj := &gs.Projectiles[i]

		// Find target enemy
		var target *Enemy
		for j := range gs.Enemies {
			if gs.Enemies[j].ID == proj.TargetID {
				target = &gs.Enemies[j]
				break
			}
		}

		// Remove projectile if target is gone
		if target == nil {
			continue
		}

		// Move projectile toward target
		dx := target.Position.X - proj.Position.X
		dy := target.Position.Y - proj.Position.Y
		dist := math.Sqrt(dx*dx + dy*dy)

		// Check if hit
		if dist < 0.3 { // Hit radius
			// Deal damage
			target.Health -= proj.Damage

			// Create explosion effect
			gs.Explosions = append(gs.Explosions, Explosion{
				ID:       gs.nextEffectID,
				Position: proj.Position,
				Duration: 0.3, // 300ms explosion
				Radius:   0.5,
			})
			gs.nextEffectID++

			// Don't keep this projectile
			continue
		}

		// Move projectile
		if dist > 0 {
			moveAmount := proj.Speed * deltaTime
			ratio := moveAmount / dist
			if ratio > 1.0 {
				ratio = 1.0
			}

			proj.Position.X += dx * ratio
			proj.Position.Y += dy * ratio
		}

		activeProjectiles = append(activeProjectiles, *proj)
	}

	gs.Projectiles = activeProjectiles
}

// updateEnemies moves enemies along paths and removes dead ones
func (gs *GameStateWithShooting) updateEnemies(deltaTime float64) {
	aliveEnemies := make([]Enemy, 0)

	for i := range gs.Enemies {
		enemy := &gs.Enemies[i]

		// Remove if dead
		if enemy.Health <= 0 {
			// Award gold
			gs.Gold += 10
			continue
		}

		// Move enemy along path
		if enemy.Path != nil && len(enemy.Path) > 0 {
			if enemy.PathIndex < len(enemy.Path) {
				target := enemy.Path[enemy.PathIndex]

				// Calculate direction to target
				dx := target.X - enemy.Position.X
				dy := target.Y - enemy.Position.Y
				distance := math.Sqrt(dx*dx + dy*dy)

				// If reached waypoint, move to next
				if distance < 0.1 {
					enemy.PathIndex++
					if enemy.PathIndex < len(enemy.Path) {
						target = enemy.Path[enemy.PathIndex]
						dx = target.X - enemy.Position.X
						dy = target.Y - enemy.Position.Y
						distance = math.Sqrt(dx*dx + dy*dy)
					}
				}

				// Move toward target
				if distance > 0 && enemy.PathIndex < len(enemy.Path) {
					moveDistance := enemy.Speed * deltaTime
					ratio := moveDistance / distance
					if ratio > 1.0 {
						ratio = 1.0
					}

					enemy.Position.X += dx * ratio
					enemy.Position.Y += dy * ratio
				}
			}
		}

		// Only keep enemies that haven't reached the end
		if enemy.PathIndex < len(enemy.Path) {
			aliveEnemies = append(aliveEnemies, *enemy)
		} else {
			// Enemy reached goal - player loses health
			gs.Health -= 10
		}
	}

	gs.Enemies = aliveEnemies
}

// updateEffects decays visual effects
func (gs *GameStateWithShooting) updateEffects(deltaTime float64) {
	// Update muzzle flashes
	activeFlashes := make([]MuzzleFlash, 0)
	for i := range gs.MuzzleFlashes {
		flash := &gs.MuzzleFlashes[i]
		flash.Duration -= deltaTime
		if flash.Duration > 0 {
			activeFlashes = append(activeFlashes, *flash)
		}
	}
	gs.MuzzleFlashes = activeFlashes

	// Update explosions
	activeExplosions := make([]Explosion, 0)
	for i := range gs.Explosions {
		explosion := &gs.Explosions[i]
		explosion.Duration -= deltaTime
		if explosion.Duration > 0 {
			activeExplosions = append(activeExplosions, *explosion)
		}
	}
	gs.Explosions = activeExplosions
}

// AddTower adds a tower to the game
func (gs *GameStateWithShooting) AddTower(x, y float64, towerType string) Tower {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	// Tower stats based on type
	stats := getTowerStats(towerType)

	tower := Tower{
		ID:        gs.nextTowerID,
		Position:  Position{X: x, Y: y},
		TowerType: towerType,
		Level:     1,
		Range:     stats.Range,
		Damage:    stats.Damage,
		FireRate:  stats.FireRate,
		Cooldown:  0,
		Rotation:  0,
	}

	gs.Towers = append(gs.Towers, tower)
	gs.nextTowerID++

	// Recalculate paths for all active enemies
	gs.RecalculateEnemyPaths()

	return tower
}

// AddEnemy adds an enemy to the game
func (gs *GameStateWithShooting) AddEnemy(enemyType string, path []Position) Enemy {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	stats := getEnemyStats(enemyType)

	enemy := Enemy{
		ID:        gs.nextEnemyID,
		Position:  path[0],
		EnemyType: enemyType,
		Health:    stats.Health,
		MaxHealth: stats.Health,
		Speed:     stats.Speed,
		Path:      path,
		PathIndex: 0,
	}

	gs.Enemies = append(gs.Enemies, enemy)
	gs.nextEnemyID++

	return enemy
}

// RemoveAllTowers clears all towers
func (gs *GameStateWithShooting) RemoveAllTowers() {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	gs.Towers = make([]Tower, 0)
	gs.Projectiles = make([]Projectile, 0)
}

// RemoveAllEnemies clears all enemies
func (gs *GameStateWithShooting) RemoveAllEnemies() {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	gs.Enemies = make([]Enemy, 0)
	gs.Projectiles = make([]Projectile, 0)
}

// GetSnapshot returns a safe copy of the game state
func (gs *GameStateWithShooting) GetSnapshot() *GameStateWithShooting {
	gs.mu.RLock()
	defer gs.mu.RUnlock()

	// Create a copy
	snapshot := &GameStateWithShooting{
		RoomID:        gs.RoomID,
		Players:       make([]string, len(gs.Players)),
		Towers:        make([]Tower, len(gs.Towers)),
		Enemies:       make([]Enemy, len(gs.Enemies)),
		Projectiles:   make([]Projectile, len(gs.Projectiles)),
		MuzzleFlashes: make([]MuzzleFlash, len(gs.MuzzleFlashes)),
		Explosions:    make([]Explosion, len(gs.Explosions)),
		Gold:          gs.Gold,
		Health:        gs.Health,
		Wave:          gs.Wave,
		GameTime:      gs.GameTime,
		SpawnPoint:    gs.SpawnPoint,
		GoalPoint:     gs.GoalPoint,
	}

	copy(snapshot.Players, gs.Players)
	copy(snapshot.Towers, gs.Towers)
	copy(snapshot.Enemies, gs.Enemies)
	copy(snapshot.Projectiles, gs.Projectiles)
	copy(snapshot.MuzzleFlashes, gs.MuzzleFlashes)
	copy(snapshot.Explosions, gs.Explosions)

	return snapshot
}

// Helper functions

type towerStats struct {
	Range    float64
	Damage   float64
	FireRate float64
}

func getTowerStats(towerType string) towerStats {
	stats := map[string]towerStats{
		"basic": {
			Range:    3.0,
			Damage:   15.0,
			FireRate: 1.0, // 1 shot per second
		},
		"sniper": {
			Range:    6.0,
			Damage:   50.0,
			FireRate: 0.5, // 1 shot every 2 seconds
		},
		"splash": {
			Range:    2.5,
			Damage:   10.0,
			FireRate: 1.5, // 1.5 shots per second
		},
		"slow": {
			Range:    3.5,
			Damage:   8.0,
			FireRate: 0.8,
		},
	}

	if s, ok := stats[towerType]; ok {
		return s
	}
	return stats["basic"]
}

type enemyStats struct {
	Health float64
	Speed  float64
}

func getEnemyStats(enemyType string) enemyStats {
	stats := map[string]enemyStats{
		"basic": {
			Health: 100.0,
			Speed:  2.0,
		},
		"fast": {
			Health: 50.0,
			Speed:  4.0,
		},
		"tank": {
			Health: 300.0,
			Speed:  1.0,
		},
		"flying": {
			Health: 80.0,
			Speed:  3.0,
		},
		"boss": {
			Health: 1000.0,
			Speed:  0.5,
		},
	}

	if s, ok := stats[enemyType]; ok {
		return s
	}
	return stats["basic"]
}

func distance(a, b Position) float64 {
	dx := a.X - b.X
	dy := a.Y - b.Y
	return math.Sqrt(dx*dx + dy*dy)
}

// BFS pathfinding around towers
func (gs *GameStateWithShooting) findPath(start, goal Position) []Position {
	const gridWidth = 20
	const gridHeight = 15

	// Create set of blocked cells (tower positions)
	blocked := make(map[string]bool)
	for _, tower := range gs.Towers {
		tx := int(math.Round(tower.Position.X))
		ty := int(math.Round(tower.Position.Y))
		key := fmt.Sprintf("%d,%d", tx, ty)
		blocked[key] = true
	}

	// BFS queue
	type queueItem struct {
		pos  Position
		path []Position
	}

	startKey := fmt.Sprintf("%d,%d", int(math.Round(start.X)), int(math.Round(start.Y)))
	goalKey := fmt.Sprintf("%d,%d", int(math.Round(goal.X)), int(math.Round(goal.Y)))

	queue := []queueItem{{pos: start, path: []Position{start}}}
	visited := make(map[string]bool)
	visited[startKey] = true

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]

		px := int(math.Round(current.pos.X))
		py := int(math.Round(current.pos.Y))
		currentKey := fmt.Sprintf("%d,%d", px, py)

		// Check if reached goal
		if currentKey == goalKey {
			return current.path
		}

		// Try all 4 directions
		neighbors := []Position{
			{X: float64(px + 1), Y: float64(py)},
			{X: float64(px - 1), Y: float64(py)},
			{X: float64(px), Y: float64(py + 1)},
			{X: float64(px), Y: float64(py - 1)},
		}

		for _, next := range neighbors {
			nx := int(math.Round(next.X))
			ny := int(math.Round(next.Y))
			key := fmt.Sprintf("%d,%d", nx, ny)

			// Check bounds
			if nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight {
				continue
			}

			// Check if blocked or visited
			if blocked[key] || visited[key] {
				continue
			}

			visited[key] = true
			newPath := make([]Position, len(current.path))
			copy(newPath, current.path)
			newPath = append(newPath, next)
			queue = append(queue, queueItem{pos: next, path: newPath})
		}
	}

	// No path found - return nil
	return nil
}

// RecalculateEnemyPaths recalculates paths for all active enemies
func (gs *GameStateWithShooting) RecalculateEnemyPaths() {
	if gs.GoalPoint == nil {
		return
	}

	for i := range gs.Enemies {
		enemy := &gs.Enemies[i]

		// Find current position (rounded to grid)
		currentPos := Position{
			X: math.Round(enemy.Position.X),
			Y: math.Round(enemy.Position.Y),
		}

		// Calculate new path from current position to goal
		newPath := gs.findPath(currentPos, *gs.GoalPoint)

		if newPath != nil {
			enemy.Path = newPath
			enemy.PathIndex = 0
		} else {
			// Enemy is trapped - stop them
			enemy.Path = []Position{currentPos}
			enemy.PathIndex = 0
		}
	}
}
